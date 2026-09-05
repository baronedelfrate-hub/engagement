import { storage } from '@/lib/storage';

const TEMPLATE_STORAGE_KEY = 'erp_report_templates';

export const saveTemplate = (name, config) => {
  const templates = getTemplates();
  const newTemplate = {
    id: `tpl_${Date.now()}`,
    name,
    config, // { source, filters, columns }
    createdAt: new Date().toISOString()
  };
  
  // Remove existing with same name if exists (upsert behavior)
  const filtered = templates.filter(t => t.name !== name);
  const updated = [...filtered, newTemplate];
  
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
  return newTemplate;
};

export const getTemplates = () => {
  try {
    const data = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const deleteTemplate = (id) => {
  const templates = getTemplates();
  const updated = templates.filter(t => t.id !== id);
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
};

export const loadTemplate = (id) => {
  const templates = getTemplates();
  return templates.find(t => t.id === id);
};