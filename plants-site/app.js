(function() {
  'use strict';

  var plantData = [];
  var favourites = [];

  var STORAGE_KEY = 'plant_directory_favourites';
  var CSV_URL = 'plants.csv';

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
      favourites.push({
        name: plant.name,
        urdu_name: plant.urdu_name || '',
        quantity: quantity
      });
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
    return fetch(url).then(function(res) { return res.arrayBuffer(); }).then(function(buf) {
      pdfUrduFontBase64 = arrayBufferToBase64(buf);
      return pdfUrduFontBase64;
    });
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
    loadUrduFont().then(function(fontBase64) {
      var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      if (fontBase64) {
        try {
          doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
          doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        } catch (e) {}
      }
      doc.setFontSize(16);
      doc.text('Favourite Plants', 14, 20);
      doc.setFontSize(10);
      var startY = 28;
      var col1 = 14;
      var col2 = 70;
      var col3 = 130;
      doc.setFont('helvetica', 'normal');
      doc.text('Name', col1, startY);
      doc.text('Urdu Name', col2, startY);
      doc.text('Quantity', col3, startY);
      startY += 7;
      doc.setFontSize(9);
      favourites.forEach(function(f) {
        if (startY > 270) {
          doc.addPage();
          startY = 20;
        }
        doc.setFont('helvetica', 'normal');
        doc.text(String(f.name).substring(0, 35), col1, startY);
        if (fontBase64 && (f.urdu_name || '').trim()) {
          try {
            doc.setFont('Amiri', 'normal');
            doc.text(String(f.urdu_name).substring(0, 25), col2, startY);
          } catch (e) {
            doc.setFont('helvetica', 'normal');
            doc.text(String(f.urdu_name || '').substring(0, 25), col2, startY);
          }
        } else {
          doc.setFont('helvetica', 'normal');
          doc.text(String(f.urdu_name || '').substring(0, 25), col2, startY);
        }
        doc.setFont('helvetica', 'normal');
        doc.text(String(f.quantity || 1), col3, startY);
        startY += 6;
      });
      doc.save('plant-favourites.pdf');
    }).catch(function() {
      var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text('Favourite Plants', 14, 20);
      doc.setFontSize(10);
      var startY = 28;
      var col1 = 14;
      var col2 = 70;
      var col3 = 130;
      doc.text('Name', col1, startY);
      doc.text('Urdu Name', col2, startY);
      doc.text('Quantity', col3, startY);
      startY += 7;
      doc.setFontSize(9);
      favourites.forEach(function(f) {
        if (startY > 270) {
          doc.addPage();
          startY = 20;
        }
        doc.text(String(f.name).substring(0, 35), col1, startY);
        doc.text(String(f.urdu_name || '').substring(0, 25), col2, startY);
        doc.text(String(f.quantity || 1), col3, startY);
        startY += 6;
      });
      doc.save('plant-favourites.pdf');
    }).finally(function() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Export Favourites as PDF';
      }
    });
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
    listEl.innerHTML = favourites.map(function(f) {
      var qty = Math.max(1, parseInt(f.quantity, 10) || 1);
      return (
        '<div class="fav-item" data-name="' + escapeHtml(f.name) + '">' +
          '<span class="fav-item-name">' + escapeHtml(f.name) + '</span>' +
          '<span class="fav-item-urdu">' + escapeHtml(f.urdu_name || '') + '</span>' +
          '<div class="fav-item-qty">' +
            '<button type="button" data-action="decrease" aria-label="Decrease">−</button>' +
            '<input type="number" min="1" value="' + qty + '" data-action="input" aria-label="Quantity">' +
            '<button type="button" data-action="increase" aria-label="Increase">+</button>' +
          '</div>' +
          '<button type="button" class="fav-item-remove" data-action="remove">Remove</button>' +
        '</div>'
      );
    }).join('');
    listEl.querySelectorAll('.fav-item').forEach(function(row) {
      var name = row.getAttribute('data-name');
      var qtyInput = row.querySelector('input[data-action="input"]');
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
      plantData.forEach(function(p) {
        if (p.category) set[p.category] = true;
      });
      return Object.keys(set).sort();
    }

    function filterPlants() {
      var q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
      var cat = (categorySelect && categorySelect.value) ? categorySelect.value : '';
      return plantData.filter(function(p) {
        var matchCat = !cat || (p.category === cat);
        if (!matchCat) return false;
        if (!q) return true;
        var nameMatch = (p.name || '').toLowerCase().indexOf(q) >= 0;
        var urduMatch = (p.urdu_name || '').indexOf(q) >= 0;
        return nameMatch || urduMatch;
      });
    }

    function renderGrid(filtered) {
      if (!gridEl) return;
      var isList = gridEl.classList.contains('view-list');
      gridEl.innerHTML = filtered.map(function(p) {
        var fav = isFavourite(p.name);
        var qty = (favourites.find(function(f) { return f.name === p.name; }) || {}).quantity || 1;
        var detailUrl = 'plant.html?name=' + encodeURIComponent(slugFromName(p.name));
        return (
          '<li class="plant-card" role="listitem">' +
            '<h3>' + escapeHtml(p.name) + '</h3>' +
            (p.urdu_name ? '<p class="urdu-name">' + escapeHtml(p.urdu_name) + '</p>' : '') +
            (p.category ? '<span class="category-tag">' + escapeHtml(p.category) + '</span>' : '') +
            '<div class="plant-card-actions">' +
              '<a href="' + detailUrl + '" class="btn btn-primary">View Details</a>' +
              '<button type="button" class="btn btn-fav ' + (fav ? 'is-favourite' : '') + '" data-plant-name="' + escapeHtml(p.name) + '" data-urdu="' + escapeHtml(p.urdu_name || '') + '" aria-pressed="' + (fav ? 'true' : 'false') + '">' + (fav ? '♥ Favourited' : '♡ Favourite') + '</button>' +
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
        btn.addEventListener('click', function() {
          var qtyEl = btn.closest('.plant-card').querySelector('.qty-selector .qty-input');
          var qty = parseInt(qtyEl && qtyEl.value ? qtyEl.value : 1, 10) || 1;
          if (isFavourite(name)) {
            removeFavourite(name);
          } else {
            addFavourite({ name: name, urdu_name: urdu }, qty);
          }
          renderGrid(filterPlants());
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

    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPdf);

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
          return {
            name: (r.name || '').trim(),
            urdu_name: (r.urdu_name || '').trim(),
            category: (r.category || '').trim(),
            wikipedia_url: (r.wikipedia_url || '').trim()
          };
        }).filter(function(p) { return p.name; });

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
            return {
              name: (r.name || '').trim(),
              urdu_name: (r.urdu_name || '').trim(),
              category: (r.category || '').trim(),
              wikipedia_url: (r.wikipedia_url || '').trim()
            };
          }).filter(function(p) { return p.name; });
          plantData = rows;
          resolve(rows);
        },
        error: function() { resolve([]); }
      });
    });

    var wikiUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titleFromUrl);
    var wikiPromise = fetch(wikiUrl, { method: 'GET' }).then(function(res) { return res.json(); }).catch(function() { return null; });

    Promise.all([csvPromise, wikiPromise]).then(function(results) {
      var data = results[0];
      var wikiData = results[1];
      var currentPlant = findPlantByName(data, titleFromUrl);
      var displayName = (currentPlant && currentPlant.name) || titleFromUrl;
      var urduName = (currentPlant && currentPlant.urdu_name) || '';
      var hasWiki = wikiData && wikiData.title && (wikiData.type === 'standard' || wikiData.extract);

      showLoading(false);
      if (!hasWiki && !currentPlant) {
        showError(true);
        return;
      }

      showArticle(true);

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
