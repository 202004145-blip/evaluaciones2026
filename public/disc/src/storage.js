// storage.js - Sistema de almacenamiento para Railway
window.storage = {
    set: async function(key, value, persistent = true) {
        try {
            const response = await fetch('/api/storage/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value, persistent })
            });
            const data = await response.json();
            return data.ok;
        } catch (error) {
            console.error('Error guardando:', error);
            return false;
        }
    },
    get: async function(key, persistent = true) {
        try {
            const response = await fetch(`/api/storage/get?key=${encodeURIComponent(key)}&persistent=${persistent}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error obteniendo:', error);
            return null;
        }
    },
    list: async function(prefix, persistent = true) {
        try {
            const response = await fetch(`/api/storage/list?prefix=${encodeURIComponent(prefix)}&persistent=${persistent}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error listando:', error);
            return { keys: [] };
        }
    },
    delete: async function(key, persistent = true) {
        try {
            const response = await fetch('/api/storage/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, persistent })
            });
            const data = await response.json();
            return data.ok;
        } catch (error) {
            console.error('Error eliminando:', error);
            return false;
        }
    }
};