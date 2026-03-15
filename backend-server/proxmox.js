// Proxmox API client - Direct REST API implementation
// Following official Proxmox API documentation: https://pve.proxmox.com/pve-docs/api-viewer
import https from 'https';
import { URL } from 'url';

const PROXMOX_HOST = process.env.PROXMOX_HOST || 'localhost';
const PROXMOX_PORT = parseInt(process.env.PROXMOX_PORT || '8006', 10);
const PROXMOX_TOKEN_ID = process.env.PROXMOX_TOKEN_ID || '';
const PROXMOX_TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET || '';
const PROXMOX_USER = process.env.PROXMOX_USER || 'root';
const PROXMOX_REALM = process.env.PROXMOX_REALM || 'pam';
/** Optional: for same-origin Proxmox session (set PVEAuthCookie when user logs into Watchtower). Only used when Proxmox is reverse-proxied under same domain. */
const PROXMOX_PASSWORD = process.env.PROXMOX_PASSWORD || '';
/** Optional: public URL for Proxmox UI when reverse-proxied (e.g. https://watchtower.example.com/proxmox). noVNC links use this so the cookie is sent. */
const PROXMOX_PUBLIC_URL = (process.env.PROXMOX_PUBLIC_URL || '').replace(/\/$/, '');

// Base URLs for Proxmox API (extjs required for clone on some versions)
const PROXMOX_BASE_URL_JSON = `https://${PROXMOX_HOST}:${PROXMOX_PORT}/api2/json`;
const PROXMOX_BASE_URL_EXTJS = `https://${PROXMOX_HOST}:${PROXMOX_PORT}/api2/extjs`;

// Proxmox API expects application/x-www-form-urlencoded for POST/PUT, not JSON
function toFormUrlEncoded(obj) {
  if (obj == null || typeof obj !== 'object') return '';
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      const val = typeof v === 'boolean' ? (v ? '1' : '0') : String(v);
      return `${encodeURIComponent(k)}=${encodeURIComponent(val)}`;
    })
    .join('&');
}

// Helper function to make Proxmox API requests
// Proxmox API returns: { data: [...] } format
// opts.useExtjs: use /api2/extjs/ base (required for clone on some Proxmox versions)
async function proxmoxRequest(endpoint, method = 'GET', data = null, opts = {}) {
  const baseUrl = opts.useExtjs ? PROXMOX_BASE_URL_EXTJS : PROXMOX_BASE_URL_JSON;
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${endpoint}`);
    const headers = {};
    if (PROXMOX_TOKEN_ID && PROXMOX_TOKEN_SECRET) {
      headers['Authorization'] = `PVEAPIToken=${PROXMOX_USER}@${PROXMOX_REALM}!${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}`;
    } else {
      reject(new Error('Proxmox API auth missing: set PROXMOX_TOKEN_ID and PROXMOX_TOKEN_SECRET in .env'));
      return;
    }

    // Proxmox API requires application/x-www-form-urlencoded for POST/PUT
    let body = null;
    if (data && (method === 'POST' || method === 'PUT')) {
      body = toFormUrlEncoded(data);
      headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
      headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
    }

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || PROXMOX_PORT,
      path: url.pathname + url.search,
      method,
      headers,
      rejectUnauthorized: false,
    };

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      
      // Set encoding to UTF-8 to properly handle text responses
      res.setEncoding('utf8');
      
      res.on('data', (chunk) => {
        // Only collect string chunks (not binary)
        if (typeof chunk === 'string') {
          chunks.push(chunk);
        } else {
          // Convert buffer to string if needed
          chunks.push(chunk.toString('utf8'));
        }
      });
      
      res.on('end', () => {
        try {
          const responseData = chunks.join('');
          
          // Check if we have any data
          const trimmed = responseData ? responseData.trim() : '';
          const isEmpty = !trimmed || trimmed.length === 0;

          if (isEmpty) {
            if (res.statusCode >= 400) {
              reject(new Error(`Proxmox API error: ${res.statusCode} - Empty response`));
            } else {
              console.log(`[Proxmox] Empty response body, status ${res.statusCode} - treating as success`);
              resolve(null);
            }
            return;
          }

          // Debug: log what we got when response might be treated as null later
          const willTreatAsNull = (res.statusCode >= 200 && res.statusCode < 300) &&
            !trimmed.startsWith('{') && !trimmed.startsWith('[');
          if (willTreatAsNull) {
            console.log(`[Proxmox] Non-JSON 2xx response: status=${res.statusCode} content-type=${res.headers['content-type']} body(${trimmed.length})=${trimmed.substring(0, 300)}`);
          }
          
          // Check Transfer-Encoding header - if chunked, we might need special handling
          const transferEncoding = res.headers['transfer-encoding'];
          if (transferEncoding && transferEncoding.toLowerCase().includes('chunked')) {
            console.log('[Proxmox] Response uses chunked transfer encoding');
          }
          
          // Validate that it looks like JSON (starts with { or [)
          if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            // Proxmox sometimes returns non-JSON for successful POST (e.g. clone); treat 2xx as success
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(null);
              return;
            }
            console.error('Response does not appear to be JSON.');
            console.error('Status Code:', res.statusCode);
            console.error('Content-Type:', res.headers['content-type']);
            console.error('Response preview:', trimmed.substring(0, 500));
            const bodyPreview = trimmed.length > 300 ? trimmed.substring(0, 300) + '...' : trimmed;
            reject(new Error(`Proxmox API error: ${res.statusCode} - ${bodyPreview}`));
            return;
          }
          
          // Parse JSON response
          let parsed;
          try {
            parsed = JSON.parse(trimmed);
          } catch (parseError) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`Proxmox API response parse failed but status ${res.statusCode} - treating as success`);
              resolve(null);
              return;
            }
            console.error('Failed to parse Proxmox API response as JSON.');
            console.error('Status Code:', res.statusCode);
            console.error('Content-Type:', res.headers['content-type']);
            console.error('Response preview (first 500):', trimmed.substring(0, 500));
            reject(new Error(`Failed to parse Proxmox API response: ${parseError.message}`));
            return;
          }
          
          // Check for API errors (Proxmox can return errors as array or object)
          if (res.statusCode >= 400) {
            let errorMsg = `Proxmox API error: ${res.statusCode}`;
            if (parsed.errors) {
              if (Array.isArray(parsed.errors) && parsed.errors[0]?.message) {
                errorMsg = parsed.errors[0].message;
              } else if (typeof parsed.errors === 'object' && !Array.isArray(parsed.errors)) {
                const parts = Object.entries(parsed.errors).map(([k, v]) => `${k}: ${v}`);
                errorMsg = parts.length ? parts.join('; ') : errorMsg;
              }
            }
            reject(new Error(errorMsg));
            return;
          }
          
          // Proxmox API returns { data: ... } (json) or { data: ..., success: 1 } (extjs)
          const result = parsed.data !== undefined ? parsed.data : parsed;
          if (result === null && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[Proxmox] Parsed JSON but data was null: status=${res.statusCode} keys=${Object.keys(parsed).join(',')} raw=${trimmed.substring(0, 200)}`);
          }
          resolve(result);
        } catch (error) {
          console.error('Error processing response:', error);
          reject(new Error(`Failed to process Proxmox API response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Proxmox API request failed: ${error.message}`));
    });
    
    // Write request body for POST/PUT (form-urlencoded)
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

/**
 * Get PVE web session (PVEAuthCookie + CSRF token) for same-origin noVNC.
 * POST /api2/json/access/ticket with username + password. Requires PROXMOX_PASSWORD.
 * Returns { ticket, csrfToken } - ticket is used as PVEAuthCookie; csrfToken is CSRFPreventionToken for write requests.
 */
export async function getPVETicket() {
  if (!PROXMOX_PASSWORD) {
    throw new Error('PROXMOX_PASSWORD is required for Proxmox session');
  }
  const body = toFormUrlEncoded({
    username: `${PROXMOX_USER}@${PROXMOX_REALM}`,
    password: PROXMOX_PASSWORD,
    realm: PROXMOX_REALM,
  });
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: PROXMOX_HOST,
      port: PROXMOX_PORT,
      path: '/api2/json/access/ticket',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
      },
      rejectUnauthorized: false,
    };
    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.setEncoding('utf8');
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          const text = chunks.join('').trim();
          if (res.statusCode !== 200) {
            reject(new Error(`Proxmox access/ticket failed: ${res.statusCode}`));
            return;
          }
          const parsed = JSON.parse(text);
          const data = parsed?.data;
          if (!data?.ticket) {
            reject(new Error('Proxmox access/ticket response missing ticket'));
            return;
          }
          resolve({
            ticket: data.ticket,
            csrfToken: data.CSRFPreventionToken || '',
          });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Get guest IP from QEMU guest agent (requires agent installed and VM running)
// API: GET /api2/json/nodes/{node}/qemu/{vmid}/agent/network-get-interfaces
function getGuestIP(node, vmid) {
  return proxmoxRequest(`/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`)
    .then((data) => {
      const result = data?.result ?? data;
      const ifaces = Array.isArray(result) ? result : (result && typeof result === 'object' ? [result] : []);
      for (const iface of ifaces) {
        const addrs = iface['ip-addresses'] || [];
        for (const addr of addrs) {
          const ip = addr['ip-address'];
          const type = addr['ip-address-type'];
          if (ip && type === 'ipv4' && ip !== '127.0.0.1') return ip;
        }
      }
      return null;
    })
    .catch(() => null);
}

// Get all VMs and containers from cluster-wide resources (single API call)
// API: GET /api2/json/cluster/resources - returns all VMs with node, vmid, name, status, template, cpu, mem, etc.
// Docs: https://pve.proxmox.com/pve-docs/api-viewer/#/cluster/resources
export async function getVMs() {
  try {
    let resources;
    try {
      resources = await proxmoxRequest('/cluster/resources');
    } catch (err) {
      console.error('GET /cluster/resources failed:', err.message);
      return [];
    }
    const list = Array.isArray(resources) ? resources : (resources && typeof resources === 'object' ? Object.values(resources) : []);

    const allVMs = list
      .filter((r) => r && (r.type === 'qemu' || r.type === 'lxc'))
      .map((r) => {
        const vmid = r.vmid != null ? r.vmid : (r.id && String(r.id).includes('/') ? parseInt(String(r.id).split('/').pop(), 10) : null);
        if (vmid == null || Number.isNaN(vmid)) return null;
        const type = r.type === 'lxc' ? 'lxc' : 'qemu';
        const template = r.template === true || r.template === 1 || r.template === '1';
        return {
          vmid,
          name: r.name != null && r.name !== '' ? r.name : (type === 'qemu' ? `VM ${vmid}` : `CT ${vmid}`),
          node: r.node || 'unknown',
          type,
          template: !!template,
          status: r.status || 'unknown',
          cpu: typeof r.cpu === 'number' ? r.cpu : 0,
          mem: typeof r.mem === 'number' ? r.mem : 0,
          maxmem: typeof r.maxmem === 'number' ? r.maxmem : 0,
          uptime: typeof r.uptime === 'number' ? r.uptime : 0,
          disk: typeof r.disk === 'number' ? r.disk : 0,
          maxdisk: typeof r.maxdisk === 'number' ? r.maxdisk : 0,
          ip: null,
        };
      })
      .filter(Boolean);

    // Enrich with guest IP from QEMU guest agent (when VM is running and agent is installed)
    const ipResults = await Promise.allSettled(
      allVMs.map((vm) => (vm.type === 'qemu' ? getGuestIP(vm.node, vm.vmid) : Promise.resolve(null)))
    );
    ipResults.forEach((result, i) => {
      if (i < allVMs.length && result.status === 'fulfilled' && result.value) {
        allVMs[i].ip = result.value;
      }
    });
    
    // Get pool information for all VMs
    try {
      const pools = await getPools();
      const poolVMMap = new Map(); // Map VM ID to pool ID
      
      if (pools && pools.length > 0) {
        for (const pool of pools) {
          try {
            const poolInfo = await getPoolVMs(pool.poolid);
            if (poolInfo?.members && Array.isArray(poolInfo.members)) {
              for (const member of poolInfo.members) {
                // Handle different member formats
                const memberType = member.type || member.vmtype || 'qemu';
                const memberVmid = member.vmid || member.id;
                if (memberVmid) {
                  const vmKey = `${memberType}/${memberVmid}`;
                  poolVMMap.set(vmKey, pool.poolid);
                }
              }
            }
          } catch (err) {
            console.warn(`Error fetching pool ${pool.poolid} members:`, err.message);
          }
        }
      }
      
      // Add pool information to VMs
      for (const vm of allVMs) {
        const vmKey = `${vm.type}/${vm.vmid}`;
        vm.pool = poolVMMap.get(vmKey) || null;
      }
    } catch (err) {
      console.warn('Error fetching pool information:', err.message);
      // Continue without pool info
      for (const vm of allVMs) {
        vm.pool = null;
      }
    }
    
    return allVMs;
  } catch (error) {
    console.error('Error fetching VMs:', error);
    console.error('Full error stack:', error.stack);
    throw error;
  }
}

// Get storage content (ISOs, templates, etc.)
// API: GET /api2/json/nodes/{node}/storage/{storage}/content
export async function getStorageContent(node, storage) {
  try {
    console.log(`Fetching content from storage: ${storage} on node: ${node}`);
    const content = await proxmoxRequest(`/nodes/${node}/storage/${storage}/content`);
    console.log(`Storage ${storage} content response type:`, typeof content, Array.isArray(content) ? 'array' : 'not array');
    if (content && Array.isArray(content) && content.length > 0) {
      console.log(`Storage ${storage} content preview (first 3):`, JSON.stringify(content.slice(0, 3), null, 2));
    }
    return content || [];
  } catch (error) {
    console.error(`Error fetching storage content from ${storage}:`, error.message);
    console.error(`Full error:`, error);
    return [];
  }
}

// Get all storages for a node
// API: GET /api2/json/nodes/{node}/storage
export async function getStorages(node) {
  try {
    const storages = await proxmoxRequest(`/nodes/${node}/storage`);
    return storages || [];
  } catch (error) {
    console.error(`Error fetching storages for node ${node}:`, error);
    return [];
  }
}

// Get default storage for a node (first available storage that can hold VMs)
export async function getDefaultStorage(node) {
  try {
    const storages = await getStorages(node);
    // Find first storage that can hold VM disks (content includes 'images')
    for (const storage of storages) {
      const content = storage.content || '';
      if (content.includes('images') || content.includes('rootdir')) {
        return storage.storage || storage;
      }
    }
    // Fallback to first storage
    if (storages.length > 0) {
      return storages[0].storage || storages[0];
    }
    return 'local'; // Default fallback
  } catch (error) {
    console.error(`Error getting default storage for node ${node}:`, error);
    return 'local';
  }
}

// Get available ISOs and templates from all storages on a node
export async function getAvailableISOsAndTemplates(node) {
  try {
    console.log(`\n=== Fetching ISOs and templates for node ${node} ===`);
    const storages = await getStorages(node);
    console.log(`Found ${storages?.length || 0} storages`);
    console.log('Storages:', JSON.stringify(storages, null, 2));
    
    const isos = [];
    const templates = [];
    
    if (!storages || storages.length === 0) {
      console.warn('No storages found for node', node);
      return { isos: [], templates: [] };
    }
    
    // Check ALL storages - don't filter by content type upfront
    for (const storage of storages) {
      const storageName = storage.storage || storage;
      const storageContent = storage.content || '';
      const storageType = storage.type || '';
      
      console.log(`\nChecking storage: ${storageName}`);
      console.log(`  Type: ${storageType}`);
      console.log(`  Content: ${storageContent}`);
      
      // Try to fetch content from ALL storages - some might have ISOs even if not explicitly marked
      try {
        const content = await getStorageContent(node, storageName);
        console.log(`  Storage ${storageName} returned ${content?.length || 0} items`);
        
        if (content && Array.isArray(content)) {
          console.log(`  Content items:`, JSON.stringify(content.slice(0, 3), null, 2)); // Log first 3 items
          
          for (const item of content) {
            const volid = item.volid || item;
            const contentType = item.content || '';
            
            // Check for ISO files - be more lenient
            if (contentType === 'iso' || 
                (typeof volid === 'string' && (volid.endsWith('.iso') || volid.toLowerCase().includes('.iso')))) {
              isos.push({
                volid: volid,
                size: item.size || 0,
                storage: storageName,
                format: item.format || '',
              });
              console.log(`  ✓ Found ISO: ${volid}`);
            }
            
            // Check for templates
            if (contentType === 'vztmpl' || 
                (typeof volid === 'string' && (volid.endsWith('.tar.gz') || volid.includes('template')))) {
              templates.push({
                volid: volid,
                size: item.size || 0,
                storage: storageName,
                format: item.format || '',
              });
              console.log(`  ✓ Found template: ${volid}`);
            }
          }
        } else {
          console.log(`  Storage ${storageName} content is not an array:`, typeof content, content);
        }
      } catch (err) {
        console.warn(`  Error fetching content from storage ${storageName}:`, err.message);
        // Continue to next storage
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Total ISOs found: ${isos.length}`);
    console.log(`Total Templates found: ${templates.length}`);
    if (isos.length > 0) {
      console.log('ISOs:', isos.map(i => i.volid).join(', '));
    }
    if (templates.length > 0) {
      console.log('Templates:', templates.map(t => t.volid).join(', '));
    }
    
    return { isos, templates };
  } catch (error) {
    console.error(`Error fetching ISOs and templates for node ${node}:`, error);
    console.error('Error stack:', error.stack);
    return { isos: [], templates: [] };
  }
}

// Clone a VM
// API: POST /api2/json/nodes/{node}/qemu/{vmid}/clone (form-urlencoded body)
export async function cloneVM(node, sourceVmid, newVmid, config) {
  try {
    const vmType = config.type || 'qemu';
    const endpoint = `/nodes/${node}/${vmType}/${sourceVmid}/clone`;
    // Required: newid, name, target (pve-node0). Omit full for linked clone.
    const cloneConfig = {
      newid: parseInt(newVmid),
      name: config.name || `Clone of VM ${sourceVmid}`,
      target: config.target || node,
    };
    if (config.full === true) {
      cloneConfig.full = 1;
    }
    if (config.pool) {
      cloneConfig.pool = config.pool;
    }
    if (config.storage) {
      cloneConfig.storage = config.storage;
    }
    if (config.params) {
      Object.assign(cloneConfig, config.params);
    }
    
    console.log(`\n=== Cloning VM ===`);
    console.log(`POST ${PROXMOX_BASE_URL_JSON}${endpoint}`);
    console.log(`Body: newid=${cloneConfig.newid} name=${cloneConfig.name} target=${cloneConfig.target}`);
    
    let result;
    try {
      result = await proxmoxRequest(endpoint, 'POST', cloneConfig);
      console.log(`Clone response:`, result);
    } catch (error) {
      // If the error is about parsing JSON but status was 200, clone might have succeeded
      if (error.message && error.message.includes('parse') && error.message.includes('chunked')) {
        console.warn('Received non-JSON response, but this might indicate successful clone');
        // Try to verify clone was created by checking if it exists
        try {
          const vmStatus = await proxmoxRequest(`/nodes/${node}/${vmType}/${newVmid}/status/current`);
          if (vmStatus) {
            console.log('Clone appears to have been created successfully (verified by status check)');
            result = { success: true, vmid: parseInt(newVmid) };
          } else {
            throw error; // Re-throw if VM doesn't exist
          }
        } catch (verifyError) {
          // If we can't verify, throw the original error
          throw error;
        }
      } else {
        throw error;
      }
    }
    
    // If pool was specified, add VM to pool after cloning
    if (config.pool) {
      try {
        await updateVMPool(newVmid, vmType, config.pool, node);
        console.log(`Clone added to pool: ${config.pool}`);
      } catch (poolErr) {
        console.warn('Clone created but failed to add to pool:', poolErr.message);
        // Don't fail the whole operation if pool assignment fails
      }
    }
    
    // Return success even if result is null (common for successful clone)
    return result || { success: true, vmid: parseInt(newVmid) };
  } catch (error) {
    console.error('Error cloning VM:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Deploy a new VM
// API: POST /api2/json/nodes/{node}/qemu or POST /api2/json/nodes/{node}/lxc
// Proxmox requires: vmid, name, and at least one storage/disk configuration
export async function deployVM(node, vmid, config) {
  try {
    const vmType = config.type || 'qemu';
    const endpoint = `/nodes/${node}/${vmType}`;
    
    // Get default storage for the node
    const defaultStorage = await getDefaultStorage(node);
    console.log(`Default storage for node ${node}: ${defaultStorage}`);
    
    // Proxmox requires certain minimum parameters to create a VM
    // For QEMU VMs, we need at least: vmid, name, and some storage/disk configuration
    const vmConfig = {
      vmid: parseInt(vmid),
      name: config.name || `VM-${vmid}`,
    };
    
    // Add ISO if provided - format: storage:iso/filename.iso,media=cdrom
    if (config.iso) {
      // ISO format should already be correct from the dropdown (e.g., "local:iso/kali-linux-2025.3-installer-amd64.iso")
      vmConfig.ide2 = `${config.iso},media=cdrom`;
    }
    
    // Proxmox requires at least one disk/storage configuration
    // If no ISO, add a minimal disk on default storage
    if (!config.iso && !config.template) {
      // Add a small disk (8GB) on default storage
      // Format: scsi0=storage:size
      vmConfig.scsi0 = `${defaultStorage}:8`;
      console.log(`Adding default disk: scsi0=${defaultStorage}:8`);
    }
    
    // For templates, we typically need to clone from a template, not create from scratch
    // Templates require cloning, not direct creation
    if (config.template) {
      throw new Error('Templates require cloning. Please use the "Clone Existing VM" option instead.');
    }
    
    // Note: Pool assignment should be done AFTER VM creation, not during creation
    // Proxmox doesn't support pool parameter during VM creation
    
    // Add other config params
    if (config.params) {
      Object.assign(vmConfig, config.params);
    }
    
    console.log(`\n=== Deploying VM ===`);
    console.log(`Node: ${node}, VMID: ${vmid}, Type: ${vmType}`);
    console.log(`Config:`, JSON.stringify(vmConfig, null, 2));
    
    let result;
    try {
      result = await proxmoxRequest(endpoint, 'POST', vmConfig);
      console.log(`VM creation response:`, result);
    } catch (error) {
      console.error('VM creation error:', error.message);
      // If the error is about parsing JSON but status was 200, VM might have been created
      if (error.message && (error.message.includes('parse') || error.message.includes('chunked'))) {
        console.warn('Received non-JSON response, verifying VM was created...');
        // Wait a moment for VM to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Try to verify VM was created by checking if it exists
        try {
          const vmStatus = await proxmoxRequest(`/nodes/${node}/${vmType}/${vmid}/status/current`);
          if (vmStatus) {
            console.log('✓ VM created successfully (verified by status check)');
            result = { success: true, vmid: parseInt(vmid) };
          } else {
            throw error; // Re-throw if VM doesn't exist
          }
        } catch (verifyError) {
          // If we can't verify, throw the original error
          throw error;
        }
      } else {
        throw error;
      }
    }
    
    // If pool was specified, add VM to pool after creation
    if (config.pool && config.pool !== 'unassigned') {
      try {
        console.log(`Adding VM ${vmid} to pool ${config.pool}...`);
        await updateVMPool(vmid, vmType, config.pool, node);
        console.log(`✓ VM added to pool: ${config.pool}`);
      } catch (poolErr) {
        console.warn('VM created but failed to add to pool:', poolErr.message);
        // Don't fail the whole operation if pool assignment fails
      }
    }
    
    // Return success even if result is null (common for successful VM creation)
    return result || { success: true, vmid: parseInt(vmid) };
  } catch (error) {
    console.error('Error deploying VM:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Get current VM status (running, stopped, etc.)
// API: GET /api2/json/nodes/{node}/qemu|lxc/{vmid}/status/current
export async function getVMStatus(node, vmid, type = 'qemu') {
  const status = await proxmoxRequest(`/nodes/${node}/${type}/${vmid}/status/current`);
  return status;
}

// Tear down (delete) a VM
// API: DELETE /api2/json/nodes/{node}/qemu/{vmid} or DELETE /api2/json/nodes/{node}/lxc/{vmid}
export async function tearDownVM(node, vmid, type = 'qemu') {
  try {
    const endpoint = `/nodes/${node}/${type}/${vmid}`;
    const result = await proxmoxRequest(endpoint, 'DELETE');
    return result;
  } catch (error) {
    console.error('Error tearing down VM:', error);
    throw error;
  }
}

// Start a VM
// API: POST /api2/json/nodes/{node}/qemu/{vmid}/status/start or POST /api2/json/nodes/{node}/lxc/{vmid}/status/start
export async function startVM(node, vmid, type = 'qemu') {
  try {
    const endpoint = `/nodes/${node}/${type}/${vmid}/status/start`;
    const result = await proxmoxRequest(endpoint, 'POST');
    return result;
  } catch (error) {
    console.error('Error starting VM:', error);
    throw error;
  }
}

// Stop a VM
// API: POST /api2/json/nodes/{node}/qemu/{vmid}/status/stop or POST /api2/json/nodes/{node}/lxc/{vmid}/status/stop
export async function stopVM(node, vmid, type = 'qemu') {
  try {
    const endpoint = `/nodes/${node}/${type}/${vmid}/status/stop`;
    const result = await proxmoxRequest(endpoint, 'POST');
    return result;
  } catch (error) {
    console.error('Error stopping VM:', error);
    throw error;
  }
}

// Reboot a VM
// API: POST /api2/json/nodes/{node}/qemu/{vmid}/status/reboot or POST /api2/json/nodes/{node}/lxc/{vmid}/status/reboot
export async function rebootVM(node, vmid, type = 'qemu') {
  try {
    const endpoint = `/nodes/${node}/${type}/${vmid}/status/reboot`;
    const result = await proxmoxRequest(endpoint, 'POST');
    return result;
  } catch (error) {
    console.error('Error rebooting VM:', error);
    throw error;
  }
}

// Get available nodes
// API: GET /api2/json/nodes
export async function getNodes() {
  try {
    const nodes = await proxmoxRequest('/nodes');
    
    return nodes.map(node => ({
      node: node.node,
      status: node.status,
      cpu: node.cpu || 0,
      mem: node.mem || 0,
      maxmem: node.maxmem || 0,
      uptime: node.uptime || 0,
    }));
  } catch (error) {
    console.error('Error fetching nodes:', error);
    throw error;
  }
}

// Known template VM names (clone sources)
const TEMPLATE_NAME_PATTERN = /^tmpl-/i;
const KNOWN_TEMPLATE_NAMES = ['tmpl-kali', 'tmpl-win11'];

function isTemplateVM(vm) {
  if (!vm || vm.type !== 'qemu') return false;
  if (vm.template === true) return true;
  const name = (vm.name || '').toLowerCase().trim();
  return TEMPLATE_NAME_PATTERN.test(name) || KNOWN_TEMPLATE_NAMES.includes(name);
}

// Get QEMU VM templates only (VMs with template=1 or name like tmpl-Kali, tmpl-Win11)
export async function getTemplates() {
  try {
    const vms = await getVMs();
    return (vms || []).filter(isTemplateVM);
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
}

// Get next available VMID from cluster
// API: GET /api2/json/cluster/nextid
export async function getNextVmid() {
  try {
    const nextId = await proxmoxRequest('/cluster/nextid');
    return nextId != null ? parseInt(nextId, 10) : null;
  } catch (error) {
    console.error('Error fetching next VMID:', error);
    throw error;
  }
}

// Score nodes for load balancing: higher = less constrained (more free memory, lower CPU)
function scoreNode(node) {
  const maxmem = node.maxmem || 1;
  const mem = node.mem || 0;
  const cpu = node.cpu || 0;
  const freeMemRatio = (maxmem - mem) / maxmem;
  const cpuHeadroom = 1 - cpu;
  return freeMemRatio * 0.5 + cpuHeadroom * 0.5;
}

// Get the best node for placing a new VM (least constrained)
export async function getBestNodeForPlacement() {
  try {
    const nodes = await getNodes();
    if (!nodes || nodes.length === 0) return null;
    const withScores = nodes
      .filter(n => n.status === 'online')
      .map(n => ({ ...n, score: scoreNode(n) }));
    withScores.sort((a, b) => b.score - a.score);
    return withScores[0]?.node || nodes[0].node;
  } catch (error) {
    console.error('Error getting best node:', error);
    throw error;
  }
}

// Get status of a Proxmox task (UPID) - for polling from frontend
// API: GET /api2/json/nodes/{node}/tasks/{upid}/status
export async function getTaskStatus(node, upid) {
  const status = await proxmoxRequest(`/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`);
  return status;
}

// Wait for a Proxmox task (UPID) to complete
// API: GET /api2/json/nodes/{node}/tasks/{upid}/status
export async function waitForTask(node, upid, options = {}) {
  const { pollMs = 2000, maxWaitMs = 600000 } = options; // default 10 min max
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const status = await getTaskStatus(node, upid);
    if (status?.status === 'stopped') {
      return status;
    }
    await new Promise(r => setTimeout(r, pollMs));
  }
  throw new Error(`Task ${upid} did not complete within ${maxWaitMs}ms`);
}

// Migrate a VM to another node
// API: POST /api2/json/nodes/{node}/qemu/{vmid}/migrate
export async function migrateVM(node, vmid, targetNode, type = 'qemu') {
  try {
    const endpoint = `/nodes/${node}/${type}/${vmid}/migrate`;
    const result = await proxmoxRequest(endpoint, 'POST', { target: targetNode });
    return result;
  } catch (error) {
    console.error('Error migrating VM:', error);
    throw error;
  }
}

// Create VM by cloning a template. Always targets pve-node0. We don't rely on the clone
// response (Proxmox creates the task on the backend); we just return the intended vmid/node/name.
export async function createFromTemplate(config) {
  const { templateVmid, templateNode, name, vmid, pool, full } = config;
  if (!templateVmid || !templateNode) {
    throw new Error('templateVmid and templateNode are required');
  }
  const newVmid = vmid != null ? parseInt(vmid, 10) : await getNextVmid();
  if (!newVmid) {
    throw new Error('Could not determine new VMID (provide vmid or ensure cluster/nextid works)');
  }
  const cloneConfig = {
    name: name || `VM-${newVmid}`,
    pool: pool || undefined,
    full: full === true,
    type: 'qemu',
    target: 'pve-node0',
  };
  await cloneVM(templateNode, templateVmid, newVmid, cloneConfig);
  return { vmid: newVmid, node: 'pve-node0', name: cloneConfig.name };
}

// After clone task has completed, run migration if needed and return final VM info
export async function finalizeCreateFromTemplate({ templateNode, vmid, targetNode, name }) {
  let currentNode = templateNode;
  if (targetNode && templateNode !== targetNode) {
    await migrateVM(templateNode, vmid, targetNode, 'qemu');
    currentNode = targetNode;
  }
  return { vmid: parseInt(vmid, 10), node: currentNode, name: name || `VM-${vmid}` };
}

// Get storage pools
// API: GET /api2/json/pools
export async function getPools() {
  try {
    const pools = await proxmoxRequest('/pools');
    
    // Handle case where pools might be null or undefined
    if (!pools) {
      console.warn('Pools response is null or undefined');
      return [];
    }
    
    // Handle both array and object responses
    const poolList = Array.isArray(pools) ? pools : (pools.data || [pools]);
    
    return poolList.map(pool => ({
      poolid: pool.poolid || pool,
      comment: pool.comment || '',
    }));
  } catch (error) {
    console.error('Error fetching pools:', error);
    console.error('Error details:', error.message);
    // Return empty array instead of throwing, so VMs can still be displayed
    return [];
  }
}

// Get VM pool information
// API: GET /api2/json/pools/{poolid}
export async function getPoolVMs(poolid) {
  try {
    const pool = await proxmoxRequest(`/pools/${poolid}`);
    
    // Handle different response formats
    if (!pool) {
      return { members: [] };
    }
    
    // Pool response should have members array
    return {
      members: pool.members || pool.data?.members || [],
      poolid: pool.poolid || poolid,
    };
  } catch (error) {
    console.warn(`Error fetching pool ${poolid} members:`, error.message);
    // Return empty members instead of throwing
    return { members: [], poolid };
  }
}

// Update pool directly (for removing VMs or setting VM list)
// API: PUT /api2/json/pools/{poolid}
// Proxmox API expects: vms parameter as comma-separated string "type/vmid,type/vmid"
export async function updatePool(poolid, vmsList) {
  try {
    console.log(`Updating pool ${poolid}`);
    console.log(`VMs list: ${vmsList}`);
    
    // Proxmox API expects vms as a comma-separated string
    const result = await proxmoxRequest(`/pools/${poolid}`, 'PUT', {
      vms: vmsList || '', // Empty string removes all VMs from pool
    });
    
    console.log(`Pool update response:`, result);
    return result;
  } catch (error) {
    console.error(`Error updating pool ${poolid}:`, error);
    console.error(`Error details:`, error.message);
    throw error;
  }
}

// Update VM pool membership
// API: PUT /api2/json/pools/{poolid}
// Proxmox pool API: vms parameter should be a comma-separated list of "type/vmid"
export async function updateVMPool(vmid, type, poolid, node) {
  try {
    console.log(`\n=== Updating VM pool membership ===`);
    console.log(`VM: ${vmid} (${type}), Target Pool: ${poolid}, Node: ${node}`);
    
    const vmString = `${type}/${vmid}`;
    
    // Get current pool members
    let existingVms = [];
    try {
      const currentPool = await getPoolVMs(poolid);
      if (currentPool?.members && Array.isArray(currentPool.members)) {
        existingVms = currentPool.members.map(m => {
          // Handle different member formats
          if (typeof m === 'string') {
            return m; // Already in format "type/vmid"
          }
          const memberVmid = m.vmid || m.id;
          const memberType = m.type || m.vmtype || 'qemu';
          return `${memberType}/${memberVmid}`;
        });
        console.log(`Current pool members: ${existingVms.join(', ')}`);
      }
    } catch (err) {
      console.log(`Pool ${poolid} might not exist, will create it with this VM`);
    }
    
    // Check if VM is already in the target pool
    if (existingVms.includes(vmString)) {
      console.log(`VM ${vmid} already in pool ${poolid}`);
      return { success: true, message: 'VM already in pool' };
    }
    
    // First, remove VM from any other pools
    try {
      const allPools = await getPools();
      for (const pool of allPools) {
        if (pool.poolid === poolid) continue; // Skip target pool
        
        try {
          const poolInfo = await getPoolVMs(pool.poolid);
          if (poolInfo?.members && Array.isArray(poolInfo.members)) {
            // Check if VM is in this pool
            const vmInPool = poolInfo.members.some(m => {
              if (typeof m === 'string') {
                return m === vmString;
              }
              const memberVmid = m.vmid || m.id;
              const memberType = m.type || m.vmtype || 'qemu';
              return memberVmid === parseInt(vmid) && memberType === type;
            });
            
            if (vmInPool) {
              // Remove VM from old pool
              console.log(`Removing VM ${vmid} from pool ${pool.poolid}`);
              const remainingVms = poolInfo.members
                .filter(m => {
                  if (typeof m === 'string') {
                    return m !== vmString;
                  }
                  const memberVmid = m.vmid || m.id;
                  const memberType = m.type || m.vmtype || 'qemu';
                  return !(memberVmid === parseInt(vmid) && memberType === type);
                })
                .map(m => {
                  if (typeof m === 'string') {
                    return m;
                  }
                  const memberVmid = m.vmid || m.id;
                  const memberType = m.type || m.vmtype || 'qemu';
                  return `${memberType}/${memberVmid}`;
                });
              
              if (remainingVms.length > 0) {
                await updatePool(pool.poolid, remainingVms.join(','));
              } else {
                // If pool is empty, we might need to handle it differently
                // For now, just log it
                console.log(`Pool ${pool.poolid} would be empty after removal`);
              }
            }
          }
        } catch (err) {
          console.warn(`Error checking pool ${pool.poolid}:`, err.message);
        }
      }
    } catch (err) {
      console.warn('Error removing VM from old pools:', err.message);
    }
    
    // Add VM to the new pool
    existingVms.push(vmString);
    const vmsList = existingVms.join(',');
    
    console.log(`Adding VM ${vmid} to pool ${poolid}`);
    console.log(`Pool VMs list: ${vmsList}`);
    
    const result = await updatePool(poolid, vmsList);
    
    console.log(`✓ Successfully updated pool ${poolid}`);
    return { success: true, result };
  } catch (error) {
    console.error('Error updating VM pool:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// noVNC + Proxmox: vncproxy must be called with websocket=1 (Proxmox rejects string "true" with "type failed got boolean true").
// API: POST .../vncproxy with body websocket=1 → { ticket: PVEVNC:..., port }
export async function getVNCConsole(node, vmid, type = 'qemu') {
  const endpoint = `/nodes/${node}/${type}/${vmid}/vncproxy`;
  const result = await proxmoxRequest(endpoint, 'POST', { websocket: 1 });
  const vncticket = result?.ticket;
  const port = result?.port != null ? result.port : 5900;
  const consoleType = type === 'qemu' ? 'kvm' : 'lxc';
  const base = PROXMOX_PUBLIC_URL || `https://${PROXMOX_HOST}:${PROXMOX_PORT}`;
  const params = new URLSearchParams({
    console: consoleType,
    novnc: '1',
    vmid: String(vmid),
    node,
    resize: '1',
  });
  if (vncticket) {
    params.set('vncticket', vncticket);
  }
  if (port && port !== 5900) {
    params.set('port', String(port));
  }
  const vncUrl = `${base}/?${params.toString()}`;
  return { ticket: vncticket || '', port, url: vncUrl };
}

/** Get vncticket + port for WebSocket proxy. Proxmox expects websocket=1 (integer), not string "true". */
export async function getVNCWebSocketTicket(node, vmid, type = 'qemu') {
  const endpoint = `/nodes/${node}/${type}/${vmid}/vncproxy`;
  const result = await proxmoxRequest(endpoint, 'POST', { websocket: 1 });
  const ticket = result?.ticket;
  const port = result?.port != null ? result.port : 5900;
  if (!ticket) throw new Error('Proxmox vncproxy did not return a ticket');
  return { ticket, port };
}

/** Build Proxmox vncwebsocket URL for backend-to-Proxmox connection. URL must include port and vncticket (short-lived; connect within ~10s). */
export function getProxmoxVncWebSocketUrl(node, vmid, type, ticket, port) {
  const path = `/api2/json/nodes/${node}/${type}/${vmid}/vncwebsocket`;
  const search = `port=${encodeURIComponent(port)}&vncticket=${encodeURIComponent(ticket)}`;
  return `wss://${PROXMOX_HOST}:${PROXMOX_PORT}${path}?${search}`;
}

// --- Console session flow (browser → app → Proxmox) ---
// PVE login ticket (PVEAuthCookie) from /access/ticket; VNC ticket from vncproxy. Do not mix.

const AUTH_CACHE_MS = 60 * 60 * 1000; // 1 hour
let proxmoxAuthCache = null;

/** Get PVE auth (ticket + CSRF), cached and refreshed. Required for vncproxy. */
export async function getProxmoxAuth() {
  if (proxmoxAuthCache && (Date.now() - proxmoxAuthCache.createdAt < AUTH_CACHE_MS)) {
    return proxmoxAuthCache;
  }
  const sess = await getPVETicket();
  proxmoxAuthCache = {
    ticket: sess.ticket,
    csrf: sess.csrfToken,
    createdAt: Date.now(),
  };
  return proxmoxAuthCache;
}

/** Call vncproxy with PVEAuthCookie + CSRF, body websocket=true. Returns { port, ticket } (VNC ticket). */
export function createVncProxySession(auth, node, vmid, type = 'qemu') {
  const path = `/api2/json/nodes/${encodeURIComponent(node)}/${encodeURIComponent(type)}/${encodeURIComponent(vmid)}/vncproxy`;
  const body = toFormUrlEncoded({ websocket: 1 });
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: PROXMOX_HOST,
      port: PROXMOX_PORT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body, 'utf8'),
        'Cookie': `PVEAuthCookie=${auth.ticket}`,
        'CSRFPreventionToken': auth.csrf,
      },
      rejectUnauthorized: false,
    };
    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.setEncoding('utf8');
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          const text = chunks.join('').trim();
          if (res.statusCode !== 200) {
            reject(new Error(`vncproxy failed: ${res.statusCode} ${text}`));
            return;
          }
          const parsed = JSON.parse(text);
          const data = parsed?.data;
          const port = data?.port != null ? data.port : 5900;
          const ticket = data?.ticket;
          if (!ticket) {
            reject(new Error('vncproxy response missing VNC ticket'));
            return;
          }
          resolve({ port, ticket });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
