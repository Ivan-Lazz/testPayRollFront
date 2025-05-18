/**
 * Component loader utility
 * Loads HTML components into designated containers
 */

/**
 * Load a component into a specified container
 * 
 * @param {string} url Path to the component file
 * @param {string} containerId ID of the container element
 * @returns {Promise<void>} Promise that resolves when the component is loaded
 */
async function loadComponent(url, containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container element #${containerId} not found`);
            return;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load component from ${url}: ${response.status} ${response.statusText}`);
        }
        
        const html = await response.text();
        container.innerHTML = html;
        
        // Execute any scripts in the component
        const scripts = container.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            const newScript = document.createElement('script');
            
            // Copy all attributes from the original script
            Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            // If the script has a src attribute, we just need to set that
            if (script.src) {
                newScript.src = script.src;
            } else {
                // Otherwise, we need to copy the content
                newScript.textContent = script.textContent;
            }
            
            // Replace the old script with the new one
            script.parentNode.replaceChild(newScript, script);
        }
        
        return true;
    } catch (error) {
        console.error(`Error loading component:`, error);
        return false;
    }
}

/**
 * Load multiple components into their respective containers
 * 
 * @param {Array} components Array of {url, containerId} objects
 * @returns {Promise<boolean>} Promise that resolves to true if all components loaded successfully
 */
async function loadComponents(components) {
    try {
        const results = await Promise.all(
            components.map(comp => loadComponent(comp.url, comp.containerId))
        );
        return results.every(result => result === true);
    } catch (error) {
        console.error('Error loading components:', error);
        return false;
    }
}

// Make functions globally available
window.loadComponent = loadComponent;
window.loadComponents = loadComponents;