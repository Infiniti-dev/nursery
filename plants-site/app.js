(function() {
  'use strict';

  var plantData = [];
  var favourites = [];

  var STORAGE_KEY = 'plant_directory_favourites';
  var NOTES_KEY = 'plant_directory_notes';
  var EDITS_KEY = 'plant_directory_edits';
  var CUSTOM_KEY = 'plant_directory_custom';
  var CUSTOM_VARIETIES_KEY = 'plant_directory_custom_varieties';
  var CSV_URL = 'plants.csv';
  var VARIETIES_CSV_URL = 'varieties.csv';

  // Column order used when parsing and re-exporting plants.csv.
  var PLANT_FIELDS = ['name', 'urdu_name', 'common_names', 'category', 'wikipedia_url', 'light', 'water', 'growing_tips', 'garden_tips', 'region_tips'];
  // Fields the AI prompt / apply step can populate (everything except name).
  var AI_FIELDS = ['urdu_name', 'common_names', 'category', 'wikipedia_url', 'light', 'water', 'growing_tips', 'garden_tips', 'region_tips'];

  // Young plants of these fruits scorch in harsh, dry afternoon sun and benefit
  // from shade protection while establishing — relevant in hot climates.
  var SCORCH_PRONE = {
    'lychee': 1, 'avocado': 1, 'dragon fruit': 1, 'kiwi': 1, 'soursop': 1,
    'rambutan': 1, 'mangosteen': 1, 'custard apple': 1, 'carambola': 1,
    'star fruit': 1, 'loquat': 1, 'papaya': 1
  };

  var LIGHT_META = {
    'full sun': { icon: '☀️', cls: 'light-full', label: 'Full sun' },
    'full sun / part shade': { icon: '⛅', cls: 'light-part', label: 'Full sun / part shade' },
    'partial shade': { icon: '🌥️', cls: 'light-shade', label: 'Partial shade' }
  };

  function lightMeta(light) {
    return LIGHT_META[String(light || '').trim().toLowerCase()] || null;
  }

  function plantIcon(name, category, cls) {
    if (window.PLANT_ICONS && window.PLANT_ICONS.getIcon) {
      return window.PLANT_ICONS.getIcon(name, category, cls);
    }
    return '';
  }

  // Resolve a favourite (plant or variety) to how it should appear in the PDF:
  // display name (varieties shown as "Plant (Variety)") and its category.
  function favouriteMeta(f) {
    var base = f.base;
    var variety = f.variety;
    if (!variety && f.name && f.name.indexOf(' — ') >= 0) {
      var parts = f.name.split(' — ');
      base = parts[0];
      variety = parts.slice(1).join(' — ');
    }
    var displayName = variety ? (base + ' (' + variety + ')') : f.name;
    var lookupName = base || f.name;
    var category = f.category || '';
    var common = '';
    if (plantData && plantData.length) {
      for (var i = 0; i < plantData.length; i++) {
        if (plantData[i].name === lookupName || plantData[i]._orig === lookupName) {
          var eff = applyEdits(plantData[i]);
          if (!category) category = eff.category || '';
          common = eff.common_names || '';
          break;
        }
      }
    }
    return { displayName: displayName, category: category, common_names: common };
  }

  function getFavourites() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setFavourites(list) {
    favourites = list;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
    if (typeof updateFavCount === 'function') updateFavCount();
    if (typeof renderFavouritesSection === 'function') renderFavouritesSection();
  }

  function addFavourite(plant, quantity) {
    quantity = Math.max(1, parseInt(quantity, 10) || 1);
    var idx = favourites.findIndex(function(f) {
      return f.name === plant.name;
    });
    if (idx >= 0) {
      favourites[idx].quantity = (favourites[idx].quantity || 0) + quantity;
    } else {
      var entry = {
        name: plant.name,
        urdu_name: plant.urdu_name || '',
        quantity: quantity
      };
      if (plant.category) entry.category = plant.category;
      if (plant.base) entry.base = plant.base;
      if (plant.variety) entry.variety = plant.variety;
      favourites.push(entry);
    }
    setFavourites(favourites.slice());
  }

  function removeFavourite(name) {
    favourites = favourites.filter(function(f) { return f.name !== name; });
    setFavourites(favourites.slice());
  }

  function updateFavQuantity(name, delta) {
    var item = favourites.find(function(f) { return f.name === name; });
    if (!item) return;
    item.quantity = Math.max(0, (item.quantity || 1) + delta);
    if (item.quantity <= 0) {
      removeFavourite(name);
      return;
    }
    setFavourites(favourites.slice());
  }

  function setFavQuantity(name, value) {
    var num = Math.max(1, parseInt(value, 10) || 1);
    var item = favourites.find(function(f) { return f.name === name; });
    if (!item) return;
    item.quantity = num;
    setFavourites(favourites.slice());
  }

  function isFavourite(name) {
    return favourites.some(function(f) { return f.name === name; });
  }

  function updateFavCount() {
    var el = document.getElementById('fav-count');
    if (el) el.textContent = favourites.length;
  }

  // ---- Notes (keyed by plant name, decoupled from favourites) ----
  function getNotes() {
    try {
      var raw = localStorage.getItem(NOTES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function setNote(name, text) {
    var notes = getNotes();
    text = (text || '').trim();
    if (text) notes[name] = text;
    else delete notes[name];
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (e) {}
  }

  // ---- Per-plant field overrides (keyed by original plant name) ----
  function getEdits() {
    try {
      var raw = localStorage.getItem(EDITS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function setEdit(name, fields) {
    var edits = getEdits();
    edits[name] = fields;
    try {
      localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
    } catch (e) {}
  }

  // ---- User-added plants ----
  function getCustom() {
    try {
      var raw = localStorage.getItem(CUSTOM_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function addCustom(plant) {
    var list = getCustom();
    list.push(plant);
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  // ---- User/AI-added varieties (match varieties.csv schema) ----
  function getCustomVarieties() {
    try {
      var raw = localStorage.getItem(CUSTOM_VARIETIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // Add varieties for a plant, de-duping by plant_name + variety_name.
  function addCustomVarieties(plantName, varieties) {
    var list = getCustomVarieties();
    var seen = {};
    list.forEach(function(v) {
      seen[normalizePlantName(v.plant_name) + '|' + normalizePlantName(v.variety_name)] = true;
    });
    var added = 0;
    (varieties || []).forEach(function(v) {
      var vn = (v.variety_name || '').trim();
      if (!vn) return;
      var k = normalizePlantName(plantName) + '|' + normalizePlantName(vn);
      if (seen[k]) return;
      seen[k] = true;
      list.push({
        plant_name: plantName,
        variety_name: vn,
        urdu_name: (v.urdu_name || '').trim(),
        notes: (v.notes || '').trim()
      });
      added++;
    });
    try {
      localStorage.setItem(CUSTOM_VARIETIES_KEY, JSON.stringify(list));
    } catch (e) {}
    return added;
  }

  // Apply saved edits on top of a raw plant row. `_orig` is the stable key
  // (original CSV / custom name) so notes and edits never orphan on rename.
  function applyEdits(plant) {
    var key = plant._orig || plant.name;
    var edits = getEdits()[key];
    var merged = { _orig: key };
    PLANT_FIELDS.forEach(function(f) { merged[f] = plant[f] || ''; });
    if (edits) {
      PLANT_FIELDS.forEach(function(f) {
        if (Object.prototype.hasOwnProperty.call(edits, f)) merged[f] = edits[f];
      });
    }
    return merged;
  }

  // Base (CSV) rows + custom additions, with edits applied. `plantData` holds
  // the raw base+custom rows; this returns the display/effective view.
  function effectivePlants() {
    return plantData.map(applyEdits);
  }

  // ---- CSV export helpers ----
  function csvCell(v) {
    v = (v == null) ? '' : String(v);
    if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  function triggerDownload(filename, content, mime) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  // Full effective directory (base + edits + custom) so the file can replace plants.csv.
  function downloadCsv() {
    var lines = [PLANT_FIELDS.join(',')];
    effectivePlants().forEach(function(p) {
      lines.push(PLANT_FIELDS.map(function(f) { return csvCell(p[f]); }).join(','));
    });
    triggerDownload('plants.csv', lines.join('\n'), 'text/csv');
  }

  // Notes have no column in plants.csv, so they persist as their own file.
  function downloadNotes() {
    var notes = getNotes();
    var keys = Object.keys(notes);
    if (keys.length === 0) {
      alert('No notes to download yet.');
      return;
    }
    var lines = ['name,note'];
    keys.forEach(function(k) {
      lines.push(csvCell(k) + ',' + csvCell(notes[k]));
    });
    triggerDownload('plant-notes.csv', lines.join('\n'), 'text/csv');
  }

  // AI/user-added varieties, in the same schema as varieties.csv.
  function downloadVarieties() {
    var list = getCustomVarieties();
    if (list.length === 0) {
      alert('No added varieties yet. Use "✨ Copy AI prompt" in a plant\'s Edit dialog to get some.');
      return;
    }
    var cols = ['plant_name', 'variety_name', 'urdu_name', 'notes'];
    var lines = [cols.join(',')];
    list.forEach(function(v) {
      lines.push(cols.map(function(c) { return csvCell(v[c]); }).join(','));
    });
    triggerDownload('varieties.csv', lines.join('\n'), 'text/csv');
  }

  // ---- Shared edit modal (built once, reused on grid + detail pages) ----
  var editModalEl = null;
  var editModalSave = null;
  var pendingEditVarieties = null;

  function editField(name, label) {
    return '<label class="form-field"><span>' + label + '</span>' +
      '<input type="text" name="' + name + '"></label>';
  }

  function editArea(name, label) {
    return '<label class="form-field"><span>' + label + '</span>' +
      '<textarea name="' + name + '" rows="2"></textarea></label>';
  }

  // Build a copy-paste prompt so the user can get plant details from any AI
  // chat (ChatGPT/Claude/etc.) and paste the JSON reply back — no API key needed.
  function buildAiPrompt(name) {
    return 'You are a horticulture expert advising a home gardener in Punjab, Pakistan. ' +
      'Assume Punjab\'s climate: very hot dry summers (up to ~45°C), mild winters with occasional light frost, ' +
      'a monsoon in July–August, and mostly alkaline soils. Tailor ALL advice to these conditions. ' +
      'For the plant named "' + name + '", reply with ONLY a JSON object (no markdown, no commentary) using exactly these keys:\n' +
      '- "urdu_name": the plant name in Urdu script\n' +
      '- "common_names": comma-separated common/local English and Urdu names\n' +
      '- "category": a short category (e.g. Fruit, Palm, Flowering Tree, Shading Tree, Ground Cover, Evergreen, Decorative)\n' +
      '- "wikipedia_url": the full English Wikipedia URL for this plant\n' +
      '- "light": exactly one of "Full sun", "Full sun / part shade", "Partial shade"\n' +
      '- "water": short water requirement for Punjab (e.g. "Moderate; water 2–3x/week in summer")\n' +
      '- "growing_tips": one or two sentences of practical growing tips (soil, best planting season/month in Punjab, pruning)\n' +
      '- "garden_tips": one or two sentences on using it in a mixed garden (good companions, placement, spacing)\n' +
      '- "region_tips": Punjab-specific advice. State clearly whether it grows well in Punjab. ' +
      'If it is NOT well suited to Punjab\'s climate, say so and suggest one or two compatible alternative plants that give a similar effect.\n' +
      '- "varieties": an array (may be empty) of the best varieties for Punjab, each an object ' +
      'with "variety_name", "urdu_name" (Urdu script) and "notes" (a short note: season, flavour/colour, or why it suits Punjab)\n' +
      'Keep everything concise. Example: {"urdu_name":"آم","common_names":"Mango, Aam","category":"Fruit",' +
      '"wikipedia_url":"https://en.wikipedia.org/wiki/Mango","light":"Full sun",' +
      '"water":"Moderate; deep watering in summer","growing_tips":"Plant in deep well-drained soil Feb–Mar; prune after fruiting.",' +
      '"garden_tips":"Give it space as a canopy tree; underplant with shade-tolerant shrubs.",' +
      '"region_tips":"Grows very well across Punjab; a classic backyard tree.",' +
      '"varieties":[{"variety_name":"Sindhri","urdu_name":"سندھڑی","notes":"Early, sweet; June"},' +
      '{"variety_name":"Chaunsa","urdu_name":"چونسا","notes":"Aromatic; July–Aug"}]}';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  // Leniently pull a JSON object out of an AI reply (handles code fences / stray prose).
  function parseAiJson(text) {
    if (!text) return null;
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(text.substring(start, end + 1));
    } catch (e) {
      return null;
    }
  }

  function buildEditModal() {
    if (editModalEl) return editModalEl;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">' +
        '<h3 id="edit-modal-title">Edit plant</h3>' +
        '<form id="edit-plant-form" class="plant-form">' +
          editField('name', 'Name') +
          editField('urdu_name', 'Urdu name') +
          editField('common_names', 'Common names') +
          editField('category', 'Category') +
          editField('wikipedia_url', 'Wikipedia URL') +
          editField('light', 'Light (Full sun / Full sun / part shade / Partial shade)') +
          editField('water', 'Water requirement') +
          editArea('growing_tips', 'Growing tips') +
          editArea('garden_tips', 'Mixed-garden tips') +
          editArea('region_tips', 'Punjab (Pakistan) tips & alternatives') +
          '<label class="form-field"><span>Notes</span><textarea name="notes" rows="3"></textarea></label>' +
          '<div class="ai-assist">' +
            '<div class="ai-assist-row">' +
              '<button type="button" class="btn btn-secondary" data-action="copy-prompt">✨ Copy AI prompt</button>' +
              '<span class="ai-assist-hint">Paste it into ChatGPT / Claude, then paste the JSON reply below.</span>' +
            '</div>' +
            '<textarea name="ai_response" rows="3" placeholder="Paste the AI\'s JSON reply here…"></textarea>' +
            '<button type="button" class="btn btn-secondary" data-action="apply-ai">Apply AI response</button>' +
            '<p class="ai-assist-status" data-role="ai-status" hidden></p>' +
          '</div>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>' +
            '<button type="submit" class="btn btn-primary">Save</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);
    editModalEl = overlay;
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeEditModal(); });
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', closeEditModal);
    overlay.querySelector('#edit-plant-form').addEventListener('submit', function(e) {
      e.preventDefault();
      if (editModalSave) editModalSave();
    });

    function fld(n) { return overlay.querySelector('[name="' + n + '"]'); }
    function status(msg, ok) {
      var el = overlay.querySelector('[data-role="ai-status"]');
      el.textContent = msg;
      el.hidden = false;
      el.className = 'ai-assist-status' + (ok ? ' ok' : ' warn');
    }
    overlay.querySelector('[data-action="copy-prompt"]').addEventListener('click', function() {
      var name = (fld('name').value || '').trim();
      if (!name) { status('Enter a plant name first.', false); return; }
      copyText(buildAiPrompt(name)).then(function() {
        status('Prompt copied. Paste it into your AI, then paste the reply below.', true);
      }).catch(function() {
        status('Could not copy automatically — the prompt is in the box below; copy it manually.', false);
        fld('ai_response').value = buildAiPrompt(name);
      });
    });
    overlay.querySelector('[data-action="apply-ai"]').addEventListener('click', function() {
      var data = parseAiJson(fld('ai_response').value);
      if (!data) { status('Could not read JSON from that reply. Paste the AI\'s JSON object.', false); return; }
      var filled = [];
      AI_FIELDS.forEach(function(f) {
        if (data[f] != null && String(data[f]).trim() && fld(f)) {
          fld(f).value = String(data[f]).trim();
          filled.push(f);
        }
      });
      var vCount = 0;
      if (Array.isArray(data.varieties) && data.varieties.length) {
        pendingEditVarieties = data.varieties;
        vCount = data.varieties.length;
      }
      if (filled.length || vCount) {
        var msg = 'Filled: ' + (filled.join(', ') || 'none');
        if (vCount) msg += ' · ' + vCount + ' varieties (saved on Save)';
        status(msg + '. Review, then Save.', true);
      } else {
        status('No matching fields found in that reply.', false);
      }
    });
    return overlay;
  }

  function closeEditModal() {
    if (editModalEl) editModalEl.hidden = true;
    editModalSave = null;
  }

  function openEditModal(plant, onSave) {
    buildEditModal();
    var key = plant._orig || plant.name;
    function fld(n) { return editModalEl.querySelector('[name="' + n + '"]'); }
    PLANT_FIELDS.forEach(function(f) { fld(f).value = plant[f] || ''; });
    fld('notes').value = getNotes()[key] || '';
    var aiResp = fld('ai_response');
    if (aiResp) aiResp.value = '';
    var aiStatus = editModalEl.querySelector('[data-role="ai-status"]');
    if (aiStatus) aiStatus.hidden = true;
    pendingEditVarieties = null;
    editModalSave = function() {
      var edit = {};
      PLANT_FIELDS.forEach(function(f) { edit[f] = fld(f).value.trim(); });
      setEdit(key, edit);
      setNote(key, fld('notes').value);
      if (pendingEditVarieties) {
        addCustomVarieties(edit.name || plant.name, pendingEditVarieties);
        pendingEditVarieties = null;
      }
      closeEditModal();
      if (onSave) onSave();
    };
    editModalEl.hidden = false;
    var first = editModalEl.querySelector('[name="name"]');
    if (first) first.focus();
  }

  var pdfUrduFontBase64 = null;

  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return typeof btoa !== 'undefined' ? btoa(binary) : '';
  }

  function loadUrduFont() {
    if (pdfUrduFontBase64) return Promise.resolve(pdfUrduFontBase64);
    var url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf';
    // Race the fetch against a timeout so PDF export still works offline / when
    // the CDN is unreachable (falls back to Latin-only text).
    var fetched = fetch(url).then(function(res) { return res.arrayBuffer(); }).then(function(buf) {
      pdfUrduFontBase64 = arrayBufferToBase64(buf);
      return pdfUrduFontBase64;
    });
    var timeout = new Promise(function(resolve) { setTimeout(function() { resolve(null); }, 20000); });
    return Promise.race([fetched, timeout]);
  }

  function exportToPdf() {
    if (favourites.length === 0) {
      alert('No favourites to export.');
      return;
    }
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) {
      alert('PDF library not loaded.');
      return;
    }
    var btn = document.getElementById('export-pdf');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Preparing PDF…';
    }
    loadUrduFont().catch(function() { return null; }).then(function(fontBase64) {
      renderPdf(fontBase64);
    }).finally(function() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Export Favourites as PDF';
      }
    });
  }

  // Each favourite prints as two rows: details, then its note (or a blank
  // underline to write on when printed).
  function renderPdf(fontBase64) {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    if (fontBase64) {
      try {
        doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      } catch (e) {}
    }
    doc.setFontSize(16);
    doc.text('Favourite Plants', 14, 20);

    var notes = getNotes();
    var col1 = 14;    // Name
    var col2 = 74;    // Urdu Name
    var col3 = 118;   // Category
    var col4 = 158;   // Qty
    var startY = 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Name', col1, startY);
    doc.text('Urdu Name', col2, startY);
    doc.text('Category', col3, startY);
    doc.text('Qty', col4, startY);
    startY += 7;

    favourites.forEach(function(f) {
      var meta = favouriteMeta(f);
      var note = (notes[f.name] || '').trim();
      var common = (meta.common_names || '').trim();
      var commonLines = common ? doc.splitTextToSize('Common names: ' + common, 182) : null;
      var noteLines = note ? doc.splitTextToSize('Notes: ' + note, 182) : null;
      var blockH = (commonLines ? commonLines.length * 4 : 0) + 5 + (noteLines ? noteLines.length * 4.5 : 4) + 4;
      if (startY + blockH > 285) {
        doc.addPage();
        startY = 20;
      }

      // Row 1 — details
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(String(meta.displayName).substring(0, 32), col1, startY);
      if (fontBase64 && (f.urdu_name || '').trim()) {
        try {
          doc.setFont('Amiri', 'normal');
          doc.text(String(f.urdu_name).substring(0, 22), col2, startY);
        } catch (e) {
          doc.setFont('helvetica', 'normal');
          doc.text(String(f.urdu_name || '').substring(0, 22), col2, startY);
        }
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text(String(f.urdu_name || '').substring(0, 22), col2, startY);
      }
      doc.setFont('helvetica', 'normal');
      doc.text(String(meta.category || '').substring(0, 20), col3, startY);
      doc.text(String(f.quantity || 1), col4, startY);

      // Optional common-names line under the details
      var y = startY;
      if (commonLines) {
        y += 4;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(commonLines, col1, y);
        y += (commonLines.length - 1) * 4;
        doc.setTextColor(0);
      }

      // Row 2 — note text, or a blank line to write on
      var ny = y + 5;
      if (noteLines) {
        doc.setFontSize(8);
        doc.setTextColor(90);
        doc.text(noteLines, col1, ny);
        doc.setTextColor(0);
        startY = ny + noteLines.length * 4.5 + 4;
      } else {
        doc.setDrawColor(200);
        doc.line(col1, ny, 196, ny);
        startY = ny + 7;
      }
    });
    doc.save('plant-favourites.pdf');
  }

  function renderFavouritesSection() {
    var section = document.getElementById('favourites-view');
    var listEl = document.getElementById('favourites-list');
    if (!section || !listEl) return;
    var isFavView = window.location.hash === '#favourites';
    if (!isFavView) return;
    if (favourites.length === 0) {
      listEl.innerHTML = '<p class="favourites-empty">No favourites yet. Go to <a href="plants.html">Directory</a> to add plants.</p>';
      section.hidden = false;
      return;
    }
    section.hidden = false;
    var notes = getNotes();
    listEl.innerHTML = favourites.map(function(f) {
      var qty = Math.max(1, parseInt(f.quantity, 10) || 1);
      return (
        '<div class="fav-item" data-name="' + escapeHtml(f.name) + '">' +
          '<div class="fav-item-main">' +
            '<span class="fav-item-name">' + escapeHtml(f.name) + '</span>' +
            '<span class="fav-item-urdu">' + escapeHtml(f.urdu_name || '') + '</span>' +
            '<div class="fav-item-qty">' +
              '<button type="button" data-action="decrease" aria-label="Decrease">−</button>' +
              '<input type="number" min="1" value="' + qty + '" data-action="input" aria-label="Quantity">' +
              '<button type="button" data-action="increase" aria-label="Increase">+</button>' +
            '</div>' +
            '<button type="button" class="fav-item-remove" data-action="remove">Remove</button>' +
          '</div>' +
          '<textarea class="fav-item-notes" data-action="notes" rows="2" placeholder="Add notes for this plant…">' + escapeHtml(notes[f.name] || '') + '</textarea>' +
        '</div>'
      );
    }).join('');
    listEl.querySelectorAll('.fav-item').forEach(function(row) {
      var name = row.getAttribute('data-name');
      var qtyInput = row.querySelector('input[data-action="input"]');
      var notesInput = row.querySelector('[data-action="notes"]');
      row.querySelector('[data-action="decrease"]').addEventListener('click', function() {
        updateFavQuantity(name, -1);
      });
      row.querySelector('[data-action="increase"]').addEventListener('click', function() {
        updateFavQuantity(name, 1);
      });
      if (qtyInput) {
        qtyInput.addEventListener('change', function() {
          setFavQuantity(name, qtyInput.value);
        });
      }
      if (notesInput) {
        notesInput.addEventListener('change', function() {
          setNote(name, notesInput.value);
        });
      }
      row.querySelector('[data-action="remove"]').addEventListener('click', function() {
        removeFavourite(name);
      });
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function slugFromName(name) {
    return String(name).trim().replace(/\s+/g, '_');
  }

  function initPlantsPage() {
    favourites = getFavourites();
    updateFavCount();

    var loadingEl = document.getElementById('loading');
    var errorEl = document.getElementById('error');
    var directoryEl = document.getElementById('directory');
    var noResultsEl = document.getElementById('no-results');
    var gridEl = document.getElementById('plant-grid');
    var searchInput = document.getElementById('search');
    var categorySelect = document.getElementById('category');
    var lightSelect = document.getElementById('light-filter');
    var viewGridBtn = document.getElementById('view-grid');
    var viewListBtn = document.getElementById('view-list');
    var resultCountEl = document.getElementById('result-count');
    var exportPdfBtn = document.getElementById('export-pdf');
    var directoryViewEl = document.getElementById('directory-view');
    var favouritesViewEl = document.getElementById('favourites-view');
    var navDirectory = document.getElementById('nav-directory');
    var navFavourites = document.getElementById('nav-favourites');

    function applyPageView() {
      var isFav = window.location.hash === '#favourites';
      if (directoryViewEl) directoryViewEl.hidden = isFav;
      if (favouritesViewEl) favouritesViewEl.hidden = !isFav;
      if (navDirectory) {
        if (isFav) navDirectory.classList.remove('active');
        else navDirectory.classList.add('active');
      }
      if (navFavourites) {
        navFavourites.classList.toggle('active', isFav);
      }
      if (isFav) renderFavouritesSection();
    }

    function showLoading(show) {
      if (loadingEl) loadingEl.hidden = !show;
    }

    function showError(show) {
      if (errorEl) errorEl.hidden = !show;
    }

    function getCategories() {
      var set = {};
      effectivePlants().forEach(function(p) {
        if (p.category) set[p.category] = true;
      });
      return Object.keys(set).sort();
    }

    function filterPlants() {
      var q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
      var cat = (categorySelect && categorySelect.value) ? categorySelect.value : '';
      var lightVal = (lightSelect && lightSelect.value) ? lightSelect.value : '';
      return effectivePlants().filter(function(p) {
        var matchCat = !cat || (p.category === cat);
        if (!matchCat) return false;
        var matchLight = !lightVal || (p.light === lightVal);
        if (!matchLight) return false;
        if (!q) return true;
        var nameMatch = (p.name || '').toLowerCase().indexOf(q) >= 0;
        var urduMatch = (p.urdu_name || '').indexOf(q) >= 0;
        var commonMatch = (p.common_names || '').toLowerCase().indexOf(q) >= 0;
        return nameMatch || urduMatch || commonMatch;
      });
    }

    function renderGrid(filtered) {
      if (!gridEl) return;
      var isList = gridEl.classList.contains('view-list');
      gridEl.innerHTML = filtered.map(function(p) {
        var fav = isFavourite(p.name);
        var qty = (favourites.find(function(f) { return f.name === p.name; }) || {}).quantity || 1;
        var detailUrl = 'plant.html?name=' + encodeURIComponent(slugFromName(p.name));
        var lm = lightMeta(p.light);
        var lightBadge = lm ? '<span class="light-badge light-badge-sm ' + lm.cls + '" title="Light requirement">' + lm.icon + ' ' + escapeHtml(lm.label) + '</span>' : '';
        return (
          '<li class="plant-card" role="listitem">' +
            '<span class="plant-card-icon" aria-hidden="true">' + plantIcon(p.name, p.category) + '</span>' +
            '<h3>' + escapeHtml(p.name) + '</h3>' +
            (p.urdu_name ? '<p class="urdu-name">' + escapeHtml(p.urdu_name) + '</p>' : '') +
            (p.category ? '<span class="category-tag">' + escapeHtml(p.category) + '</span>' : '') +
            lightBadge +
            '<div class="plant-card-actions">' +
              '<a href="' + detailUrl + '" class="btn btn-primary">View Details</a>' +
              '<button type="button" class="btn btn-secondary btn-edit" data-plant-orig="' + escapeHtml(p._orig || p.name) + '">Edit</button>' +
              '<button type="button" class="btn btn-fav ' + (fav ? 'is-favourite' : '') + '" data-plant-name="' + escapeHtml(p.name) + '" data-urdu="' + escapeHtml(p.urdu_name || '') + '" data-category="' + escapeHtml(p.category || '') + '" aria-pressed="' + (fav ? 'true' : 'false') + '">' + (fav ? '♥ Favourited' : '♡ Favourite') + '</button>' +
              '<div class="qty-selector" data-plant-name="' + escapeHtml(p.name) + '">' +
                '<button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>' +
                '<input type="number" min="1" value="' + qty + '" class="qty-input" aria-label="Quantity">' +
                '<button type="button" data-qty="1" aria-label="Increase quantity">+</button>' +
              '</div>' +
            '</div>' +
          '</li>'
        );
      }).join('');

      gridEl.querySelectorAll('.btn-fav').forEach(function(btn) {
        var name = btn.getAttribute('data-plant-name');
        var urdu = btn.getAttribute('data-urdu') || '';
        var category = btn.getAttribute('data-category') || '';
        btn.addEventListener('click', function() {
          var qtyEl = btn.closest('.plant-card').querySelector('.qty-selector .qty-input');
          var qty = parseInt(qtyEl && qtyEl.value ? qtyEl.value : 1, 10) || 1;
          if (isFavourite(name)) {
            removeFavourite(name);
          } else {
            addFavourite({ name: name, urdu_name: urdu, category: category }, qty);
          }
          renderGrid(filterPlants());
        });
      });

      gridEl.querySelectorAll('.btn-edit').forEach(function(btn) {
        var orig = btn.getAttribute('data-plant-orig');
        btn.addEventListener('click', function() {
          var plant = effectivePlants().filter(function(p) { return p._orig === orig; })[0];
          if (plant) openEditModal(plant, function() { renderGrid(filterPlants()); });
        });
      });

      gridEl.querySelectorAll('.qty-selector').forEach(function(sel) {
        var name = sel.getAttribute('data-plant-name');
        var input = sel.querySelector('.qty-input');
        if (input) {
          input.addEventListener('change', function() {
            var val = Math.max(1, parseInt(input.value, 10) || 1);
            input.value = val;
            if (isFavourite(name)) setFavQuantity(name, val);
          });
        }
        sel.querySelectorAll('button[data-qty]').forEach(function(b) {
          b.addEventListener('click', function() {
            var delta = parseInt(b.getAttribute('data-qty'), 10);
            var current = parseInt(input && input.value ? input.value : 1, 10) || 1;
            var next = Math.max(1, current + delta);
            if (input) input.value = next;
            if (isFavourite(name)) updateFavQuantity(name, delta);
          });
        });
      });
    }

    function applyView() {
      if (viewGridBtn && viewGridBtn.classList.contains('active')) {
        gridEl.classList.remove('view-list');
        gridEl.classList.add('view-grid');
      } else {
        gridEl.classList.remove('view-grid');
        gridEl.classList.add('view-list');
      }
    }

    if (viewGridBtn) {
      viewGridBtn.addEventListener('click', function() {
        viewGridBtn.classList.add('active');
        if (viewListBtn) viewListBtn.classList.remove('active');
        applyView();
      });
    }
    if (viewListBtn) {
      viewListBtn.addEventListener('click', function() {
        viewListBtn.classList.add('active');
        if (viewGridBtn) viewGridBtn.classList.remove('active');
        applyView();
      });
    }

    function runFilter() {
      var filtered = filterPlants();
      if (directoryEl) directoryEl.hidden = filtered.length === 0;
      if (noResultsEl) noResultsEl.hidden = filtered.length > 0;
      if (resultCountEl) resultCountEl.textContent = filtered.length;
      renderGrid(filtered);
      applyView();
    }

    if (searchInput) {
      searchInput.addEventListener('input', runFilter);
      searchInput.addEventListener('keyup', runFilter);
    }
    if (categorySelect) {
      categorySelect.addEventListener('change', runFilter);
    }
    if (lightSelect) {
      lightSelect.addEventListener('change', runFilter);
    }

    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPdf);

    var downloadCsvBtn = document.getElementById('download-csv');
    if (downloadCsvBtn) downloadCsvBtn.addEventListener('click', downloadCsv);
    var downloadNotesBtn = document.getElementById('download-notes');
    if (downloadNotesBtn) downloadNotesBtn.addEventListener('click', downloadNotes);
    var downloadVarBtn = document.getElementById('download-varieties');
    if (downloadVarBtn) downloadVarBtn.addEventListener('click', downloadVarieties);

    var toggleAddBtn = document.getElementById('toggle-add-plant');
    var addPlantForm = document.getElementById('add-plant-form');
    if (toggleAddBtn && addPlantForm) {
      toggleAddBtn.addEventListener('click', function() {
        addPlantForm.hidden = !addPlantForm.hidden;
      });
    }
    if (addPlantForm) {
      addPlantForm.addEventListener('submit', function(e) {
        e.preventDefault();
        function fv(n) {
          var el = addPlantForm.querySelector('[name="' + n + '"]');
          return el ? el.value.trim() : '';
        }
        var name = fv('name');
        if (!name) { alert('Plant name is required.'); return; }
        var plant = { _orig: name };
        PLANT_FIELDS.forEach(function(f) { plant[f] = fv(f); });
        addCustom(plant);
        plantData.push(plant);
        var categories = getCategories();
        if (categorySelect) {
          var existing = {};
          Array.prototype.forEach.call(categorySelect.options, function(o) { existing[o.value] = true; });
          categories.forEach(function(c) {
            if (!existing[c]) categorySelect.appendChild(new Option(c, c));
          });
        }
        addPlantForm.reset();
        addPlantForm.hidden = true;
        runFilter();
      });
    }

    window.addEventListener('hashchange', applyPageView);
    applyPageView();

    showLoading(true);
    showError(false);

    if (typeof Papa === 'undefined') {
      showLoading(false);
      showError(true);
      return;
    }

    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        if (loadingEl) {
          loadingEl.hidden = true;
          loadingEl.style.display = 'none';
        }
        if (directoryEl) directoryEl.hidden = false;
        var rows = results.data || [];
        plantData = rows.map(function(r) {
          var name = (r.name || '').trim();
          return {
            _orig: name,
            name: name,
            urdu_name: (r.urdu_name || '').trim(),
            common_names: (r.common_names || '').trim(),
            category: (r.category || '').trim(),
            wikipedia_url: (r.wikipedia_url || '').trim(),
            light: (r.light || '').trim(),
            water: (r.water || '').trim(),
            growing_tips: (r.growing_tips || '').trim(),
            garden_tips: (r.garden_tips || '').trim(),
            region_tips: (r.region_tips || '').trim()
          };
        }).filter(function(p) { return p.name; });

        // Merge user-added plants so they appear in the directory.
        getCustom().forEach(function(c) {
          c._orig = c._orig || c.name;
          plantData.push(c);
        });

        var categories = getCategories();
        if (categorySelect) {
          categories.forEach(function(c) {
            categorySelect.appendChild(new Option(c, c));
          });
        }

        runFilter();
      },
      error: function() {
        if (loadingEl) {
          loadingEl.hidden = true;
          loadingEl.style.display = 'none';
        }
        showError(true);
      }
    });
  }

  function normalizePlantName(s) {
    return (s || '').trim().replace(/_/g, ' ').toLowerCase();
  }

  function findPlantByName(data, name) {
    var norm = normalizePlantName(name);
    for (var i = 0; i < data.length; i++) {
      if (normalizePlantName(data[i].name) === norm) return data[i];
    }
    return null;
  }

  function initPlantPage() {
    var params = new URLSearchParams(window.location.search);
    var nameParam = params.get('name');
    if (!nameParam || !nameParam.trim()) {
      document.getElementById('loading-detail').hidden = true;
      document.getElementById('invalid-plant').hidden = false;
      return;
    }

    favourites = getFavourites();
    var titleFromUrl = decodeURIComponent(nameParam.trim()).replace(/_/g, ' ');
    var loadingEl = document.getElementById('loading-detail');
    var errorEl = document.getElementById('error-detail');
    var articleEl = document.getElementById('plant-detail');
    var invalidEl = document.getElementById('invalid-plant');
    var actionsEl = document.getElementById('plant-detail-actions');
    var relatedSection = document.getElementById('related-plants');
    var relatedList = document.getElementById('related-plants-list');
    var relatedSubtitle = document.getElementById('related-plants-subtitle');

    function showLoading(show) {
      if (loadingEl) loadingEl.hidden = !show;
    }
    function showError(show) {
      if (errorEl) errorEl.hidden = !show;
    }
    function showArticle(show) {
      if (articleEl) articleEl.hidden = !show;
    }

    function renderDetailFavUI(plant) {
      if (!actionsEl || !plant) return;
      var favBtn = document.getElementById('detail-fav-btn');
      var qtyInput = actionsEl.querySelector('.qty-selector-detail .qty-input');
      var fav = favourites.find(function(f) { return f.name === plant.name; });
      var qty = fav ? (fav.quantity || 1) : 1;
      actionsEl.hidden = false;
      if (favBtn) {
        favBtn.textContent = fav ? '♥ Favourited' : '♡ Favourite';
        favBtn.classList.toggle('is-favourite', !!fav);
        favBtn.setAttribute('aria-pressed', fav ? 'true' : 'false');
      }
      if (qtyInput) qtyInput.value = qty;
    }

    function renderRelatedPlants(plant, allPlants) {
      if (!relatedSection || !relatedList || !plant || !plant.category) return;
      var related = allPlants.filter(function(p) {
        return p.category === plant.category && normalizePlantName(p.name) !== normalizePlantName(plant.name);
      });
      related = related.slice(0, 12);
      if (related.length === 0) {
        relatedSection.hidden = true;
        return;
      }
      relatedSection.hidden = false;
      if (relatedSubtitle) relatedSubtitle.textContent = 'Other ' + plant.category + ' varieties';
      relatedList.innerHTML = related.map(function(p) {
        var detailUrl = 'plant.html?name=' + encodeURIComponent(slugFromName(p.name));
        return (
          '<li><a href="' + detailUrl + '">' + escapeHtml(p.name) +
          (p.urdu_name ? ' <span class="related-urdu">(' + escapeHtml(p.urdu_name) + ')</span>' : '') +
          '</a></li>'
        );
      }).join('');
    }

    function renderVarieties(plant, allVarieties) {
      var section = document.getElementById('varieties');
      var listEl = document.getElementById('varieties-list');
      var subtitleEl = document.getElementById('varieties-subtitle');
      if (!section || !listEl || !plant) return;
      var custom = getCustomVarieties().filter(function(v) {
        return normalizePlantName(v.plant_name) === normalizePlantName(plant.name);
      });
      var matches = allVarieties.filter(function(v) {
        return normalizePlantName(v.plant_name) === normalizePlantName(plant.name);
      }).concat(custom);
      if (matches.length === 0) {
        section.hidden = true;
        return;
      }
      section.hidden = false;
      if (subtitleEl) {
        subtitleEl.textContent = matches.length + ' known ' +
          (matches.length === 1 ? 'variety' : 'varieties') + ' of ' + plant.name;
      }
      listEl.innerHTML = matches.map(function(v) {
        var favName = plant.name + ' — ' + v.variety_name;
        var fav = isFavourite(favName);
        var qty = (favourites.find(function(f) { return f.name === favName; }) || {}).quantity || 1;
        return (
          '<li class="variety-item" data-fav-name="' + escapeHtml(favName) + '" data-urdu="' + escapeHtml(v.urdu_name || '') + '" data-variety="' + escapeHtml(v.variety_name) + '">' +
            '<span class="variety-name">' + escapeHtml(v.variety_name) + '</span>' +
            (v.urdu_name ? '<span class="variety-urdu">' + escapeHtml(v.urdu_name) + '</span>' : '') +
            (v.notes ? '<span class="variety-notes">' + escapeHtml(v.notes) + '</span>' : '') +
            '<div class="variety-actions">' +
              '<button type="button" class="btn btn-fav btn-fav-sm ' + (fav ? 'is-favourite' : '') + '" data-action="fav" aria-pressed="' + (fav ? 'true' : 'false') + '">' + (fav ? '♥ Favourited' : '♡ Favourite') + '</button>' +
              '<div class="qty-selector" data-action="qty">' +
                '<button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>' +
                '<input type="number" min="1" value="' + qty + '" class="qty-input" aria-label="Quantity">' +
                '<button type="button" data-qty="1" aria-label="Increase quantity">+</button>' +
              '</div>' +
            '</div>' +
          '</li>'
        );
      }).join('');

      listEl.querySelectorAll('.variety-item').forEach(function(row) {
        var favName = row.getAttribute('data-fav-name');
        var urdu = row.getAttribute('data-urdu') || '';
        var input = row.querySelector('.qty-input');
        var favBtn = row.querySelector('[data-action="fav"]');
        if (favBtn) {
          favBtn.addEventListener('click', function() {
            if (isFavourite(favName)) {
              removeFavourite(favName);
            } else {
              var q = parseInt(input && input.value ? input.value : 1, 10) || 1;
              addFavourite({ name: favName, urdu_name: urdu, base: plant.name, variety: row.getAttribute('data-variety') || '', category: plant.category || 'Fruit' }, q);
            }
            renderVarieties(plant, allVarieties);
          });
        }
        if (input) {
          input.addEventListener('change', function() {
            var val = Math.max(1, parseInt(input.value, 10) || 1);
            input.value = val;
            if (isFavourite(favName)) setFavQuantity(favName, val);
          });
        }
        row.querySelectorAll('.qty-selector button[data-qty]').forEach(function(b) {
          b.addEventListener('click', function() {
            var delta = parseInt(b.getAttribute('data-qty'), 10);
            var current = parseInt(input && input.value ? input.value : 1, 10) || 1;
            var next = Math.max(1, current + delta);
            if (input) input.value = next;
            if (isFavourite(favName)) updateFavQuantity(favName, delta);
          });
        });
      });
    }

    function renderLightAndIcon(displayName, plant) {
      var category = (plant && plant.category) || '';
      var iconEl = document.getElementById('plant-detail-icon');
      if (iconEl) iconEl.innerHTML = plantIcon(displayName, category, 'plant-icon-svg plant-icon-svg-lg');

      var lightEl = document.getElementById('plant-light');
      var lm = plant ? lightMeta(plant.light) : null;
      if (lightEl) {
        if (lm) {
          lightEl.className = 'light-badge ' + lm.cls;
          lightEl.innerHTML = '<span class="light-icon">' + lm.icon + '</span> Light: <strong>' + escapeHtml(lm.label) + '</strong>';
          lightEl.hidden = false;
        } else {
          lightEl.hidden = true;
        }
      }

      var noteEl = document.getElementById('plant-heat-note');
      if (noteEl) {
        var scorch = SCORCH_PRONE[normalizePlantName(displayName)];
        if (scorch) {
          noteEl.textContent = '🌡️ In hot, dry climates protect young plants from harsh afternoon sun until established.';
          noteEl.hidden = false;
        } else {
          noteEl.hidden = true;
        }
      }
    }

    showLoading(true);
    showError(false);
    showArticle(false);
    if (invalidEl) invalidEl.hidden = true;

    var csvPromise = new Promise(function(resolve) {
      if (typeof Papa === 'undefined') {
        resolve([]);
        return;
      }
      Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          var rows = (results.data || []).map(function(r) {
            var name = (r.name || '').trim();
            return {
              _orig: name,
              name: name,
              urdu_name: (r.urdu_name || '').trim(),
              common_names: (r.common_names || '').trim(),
              category: (r.category || '').trim(),
              wikipedia_url: (r.wikipedia_url || '').trim(),
              light: (r.light || '').trim(),
              water: (r.water || '').trim(),
              growing_tips: (r.growing_tips || '').trim(),
              garden_tips: (r.garden_tips || '').trim(),
              region_tips: (r.region_tips || '').trim()
            };
          }).filter(function(p) { return p.name; });
          getCustom().forEach(function(c) {
            c._orig = c._orig || c.name;
            rows.push(c);
          });
          plantData = rows;
          resolve(rows);
        },
        error: function() { resolve([]); }
      });
    });

    var varietiesPromise = new Promise(function(resolve) {
      if (typeof Papa === 'undefined') {
        resolve([]);
        return;
      }
      Papa.parse(VARIETIES_CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          var rows = (results.data || []).map(function(r) {
            return {
              plant_name: (r.plant_name || '').trim(),
              variety_name: (r.variety_name || '').trim(),
              urdu_name: (r.urdu_name || '').trim(),
              notes: (r.notes || '').trim()
            };
          }).filter(function(v) { return v.plant_name && v.variety_name; });
          resolve(rows);
        },
        error: function() { resolve([]); }
      });
    });

    var wikiUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titleFromUrl);
    var wikiPromise = fetch(wikiUrl, { method: 'GET' }).then(function(res) { return res.json(); }).catch(function() { return null; });

    Promise.all([csvPromise, wikiPromise, varietiesPromise]).then(function(results) {
      var data = results[0];
      var wikiData = results[1];
      var varietiesData = results[2] || [];
      var currentPlant = findPlantByName(data, titleFromUrl);
      if (currentPlant) currentPlant = applyEdits(currentPlant);
      var displayName = (currentPlant && currentPlant.name) || titleFromUrl;
      var urduName = (currentPlant && currentPlant.urdu_name) || '';
      var hasWiki = wikiData && wikiData.title && (wikiData.type === 'standard' || wikiData.extract);

      showLoading(false);
      if (!hasWiki && !currentPlant) {
        showError(true);
        return;
      }

      showArticle(true);

      renderLightAndIcon(displayName, currentPlant);

      var titleEl = document.getElementById('plant-title');
      var urduEl = document.getElementById('plant-urdu');
      var descEl = document.getElementById('plant-description');
      var imgEl = document.getElementById('plant-image');
      var placeholderEl = document.getElementById('plant-image-placeholder');
      var linkEl = document.getElementById('plant-wikipedia');
      var youtubeEl = document.getElementById('plant-youtube');
      var googleEl = document.getElementById('plant-google');
      var searchQuery = encodeURIComponent(displayName);
      if (youtubeEl) {
        youtubeEl.href = 'https://www.youtube.com/results?search_query=' + searchQuery;
        youtubeEl.hidden = false;
      }
      if (googleEl) {
        googleEl.href = 'https://www.google.com/search?q=' + searchQuery;
        googleEl.hidden = false;
      }

      if (titleEl) titleEl.textContent = displayName;
      if (urduEl) {
        urduEl.textContent = urduName;
        urduEl.hidden = !urduName;
      }
      var commonEl = document.getElementById('plant-common');
      if (commonEl) {
        var commonNames = (currentPlant && currentPlant.common_names) || '';
        commonEl.textContent = commonNames ? 'Also known as: ' + commonNames : '';
        commonEl.hidden = !commonNames;
      }

      // Care tips (water / growing / mixed-garden)
      var careEl = document.getElementById('plant-care');
      if (careEl) {
        var careMap = [
          { key: 'water', el: 'care-water' },
          { key: 'growing_tips', el: 'care-growing' },
          { key: 'garden_tips', el: 'care-garden' },
          { key: 'region_tips', el: 'care-region' }
        ];
        var anyCare = false;
        careMap.forEach(function(c) {
          var val = (currentPlant && currentPlant[c.key]) || '';
          var dd = document.getElementById(c.el);
          var item = dd ? dd.closest('.plant-care-item') : null;
          if (dd) dd.textContent = val;
          if (item) item.hidden = !val;
          if (val) anyCare = true;
        });
        careEl.hidden = !anyCare;
      }

      // Notes + edit — keyed by the stable original name.
      var noteKey = (currentPlant && currentPlant._orig) || displayName;
      var notesInput = document.getElementById('plant-notes-input');
      var notesBlock = document.getElementById('plant-notes-block');
      if (notesInput && notesBlock) {
        notesBlock.hidden = false;
        notesInput.value = getNotes()[noteKey] || '';
        notesInput.addEventListener('change', function() {
          setNote(noteKey, notesInput.value);
        });
      }
      var editBtn = document.getElementById('detail-edit-btn');
      if (editBtn && currentPlant) {
        editBtn.hidden = false;
        editBtn.addEventListener('click', function() {
          openEditModal(currentPlant, function() { window.location.reload(); });
        });
      }

      if (hasWiki) {
        if (descEl) {
          var extract = wikiData.extract || 'No description available.';
          descEl.innerHTML = '<p>' + escapeHtml(extract) + '</p>';
        }
        if (wikiData.thumbnail && wikiData.thumbnail.source) {
          imgEl.src = wikiData.thumbnail.source;
          imgEl.alt = wikiData.title;
          imgEl.hidden = false;
          if (placeholderEl) placeholderEl.hidden = true;
        } else {
          imgEl.hidden = true;
          if (placeholderEl) placeholderEl.hidden = false;
        }
        var apiTitle = encodeURIComponent(titleFromUrl);
        var wikiLinkUrl = wikiData.content_urls && wikiData.content_urls.desktop && wikiData.content_urls.desktop.page
          ? wikiData.content_urls.desktop.page
          : 'https://en.wikipedia.org/wiki/' + apiTitle;
        if (linkEl) {
          linkEl.href = wikiLinkUrl;
          linkEl.textContent = 'Read on Wikipedia';
          linkEl.hidden = false;
        }
      } else {
        if (descEl) descEl.innerHTML = '<p>Description could not be loaded from Wikipedia.</p>';
        imgEl.hidden = true;
        if (placeholderEl) placeholderEl.hidden = false;
        if (linkEl) linkEl.hidden = true;
      }

      if (document.title !== undefined) document.title = displayName + ' — Pakistan Plant Directory';

      if (currentPlant) {
        renderDetailFavUI(currentPlant);
        renderVarieties(currentPlant, varietiesData);
        renderRelatedPlants(currentPlant, data);

        if (actionsEl) {
          var favBtn = document.getElementById('detail-fav-btn');
          var qtySel = document.getElementById('detail-qty');
          if (favBtn) {
            favBtn.addEventListener('click', function() {
              if (isFavourite(currentPlant.name)) {
                removeFavourite(currentPlant.name);
              } else {
                var qtyEl = qtySel && qtySel.querySelector('.qty-input');
                var qty = parseInt(qtyEl && qtyEl.value ? qtyEl.value : 1, 10) || 1;
                addFavourite(currentPlant, qty);
              }
              renderDetailFavUI(currentPlant);
            });
          }
          if (qtySel) {
            var qtyInput = qtySel.querySelector('.qty-input');
            if (qtyInput) {
              qtyInput.addEventListener('change', function() {
                var val = Math.max(1, parseInt(qtyInput.value, 10) || 1);
                qtyInput.value = val;
                if (isFavourite(currentPlant.name)) setFavQuantity(currentPlant.name, val);
                else addFavourite(currentPlant, val);
                renderDetailFavUI(currentPlant);
              });
            }
            qtySel.querySelectorAll('button[data-qty]').forEach(function(btn) {
              btn.addEventListener('click', function() {
                var delta = parseInt(btn.getAttribute('data-qty'), 10);
                var cur = parseInt(qtyInput && qtyInput.value ? qtyInput.value : 1, 10) || 1;
                var next = Math.max(1, cur + delta);
                if (qtyInput) qtyInput.value = next;
                if (isFavourite(currentPlant.name)) {
                  updateFavQuantity(currentPlant.name, delta);
                } else {
                  addFavourite(currentPlant, next);
                }
                renderDetailFavUI(currentPlant);
              });
            });
          }
        }
      } else {
        if (actionsEl) actionsEl.hidden = true;
        if (relatedSection) relatedSection.hidden = true;
      }
    });
  }

  window.PLANT_DIRECTORY_INIT = function(page) {
    if (page === 'plants') {
      initPlantsPage();
    } else if (page === 'plant') {
      initPlantPage();
    }
  };
})();
