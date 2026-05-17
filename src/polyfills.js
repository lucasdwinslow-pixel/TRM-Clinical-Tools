import * as PDFLib from "pdf-lib";
import { jsPDF } from "jspdf";

if (!window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const value = localStorage.getItem(key);
        if (value === null) return null;
        return { key, value };
      } catch { return null; }
    },
    set: async (key, value) => {
      try {
        localStorage.setItem(key, value);
        return { key, value };
      } catch { return null; }
    },
    delete: async (key) => {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true };
      } catch { return null; }
    },
    list: async (prefix = "") => {
      try {
        const keys = Object.keys(localStorage).filter(k =>
          prefix ? k.startsWith(prefix) : true
        );
        return { keys, prefix };
      } catch { return { keys: [] }; }
    },
  };
}

if (!window.PDFLib) {
  window.PDFLib = PDFLib;
}

if (!window.jspdf) {
  window.jspdf = { jsPDF };
}
