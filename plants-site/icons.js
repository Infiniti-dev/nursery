(function() {
  'use strict';

  // Each entry is the inner markup of a 0 0 24 24 SVG. Kept simple, recognizable,
  // and fully inline so the site stays offline-friendly (no external assets).
  var I = {
    // ---- Fruit-specific ----
    mango: '<ellipse cx="12" cy="13" rx="7" ry="8" fill="#f6a623"/><path d="M12 5c3 0 5 2 6 4-2-1-4-1-6-1s-4 0-6 1c1-2 3-4 6-4z" fill="#e8871e"/><path d="M12 5c1-2 3-3 5-3-1 2-3 3-5 3z" fill="#4a8b2c"/>',
    banana: '<path d="M5 7c1 7 6 12 13 12 1 0 2-1 1-2-6-1-10-5-11-11 0-1-3-1-3 1z" fill="#f7d02c"/><path d="M6 6l-1-1M18 18l1 1" stroke="#6b5a12" stroke-width="1.5" stroke-linecap="round"/>',
    guava: '<circle cx="12" cy="13" r="8" fill="#a7c34a"/><circle cx="12" cy="13" r="3.5" fill="#f0a6a0"/><path d="M12 5c0-2 2-3 4-3-1 2-2 3-4 3z" fill="#4a8b2c"/>',
    pomegranate: '<circle cx="12" cy="14" r="7.5" fill="#c0392b"/><path d="M12 6.5l-2-2.5h4z" fill="#8e2f22"/><path d="M12 6.5V4M10 5l-1.5-1.5M14 5l1.5-1.5" stroke="#8e2f22" stroke-width="1.3" stroke-linecap="round"/><circle cx="10" cy="14" r="1" fill="#f4c1b8"/><circle cx="14" cy="13" r="1" fill="#f4c1b8"/><circle cx="12" cy="16" r="1" fill="#f4c1b8"/>',
    grape: '<g fill="#7b4397"><circle cx="12" cy="7" r="2.3"/><circle cx="9" cy="10" r="2.3"/><circle cx="15" cy="10" r="2.3"/><circle cx="12" cy="12" r="2.3"/><circle cx="10" cy="15" r="2.3"/><circle cx="14" cy="15" r="2.3"/><circle cx="12" cy="18" r="2.3"/></g><path d="M12 5V3M12 3c1-1 3-1 4 0" stroke="#4a8b2c" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    citrus: '<circle cx="12" cy="13" r="8" fill="#f79f1f"/><path d="M12 5c0-2 2-3 4-3-1 2-2 3-4 3z" fill="#4a8b2c"/><g stroke="#e07b00" stroke-width="1"><path d="M12 5v16M4 13h16M6.3 7.3l11.4 11.4M17.7 7.3L6.3 18.7"/></g>',
    papaya: '<ellipse cx="12" cy="13" rx="6" ry="8.5" fill="#f28e2b"/><ellipse cx="12" cy="14" rx="2.5" ry="4" fill="#7a4a1e"/><g fill="#3a2410"><circle cx="12" cy="12" r="0.7"/><circle cx="12" cy="14" r="0.7"/><circle cx="12" cy="16" r="0.7"/></g><path d="M12 4.5c1-1 3-1 4 0-1 1-3 1-4 0z" fill="#4a8b2c"/>',
    fig: '<path d="M12 21c-4 0-6-3-6-6 0-4 3-8 6-9 3 1 6 5 6 9 0 3-2 6-6 6z" fill="#6b3f6e"/><path d="M12 6V3M10 4l4 0" stroke="#4a8b2c" stroke-width="1.4" stroke-linecap="round"/>',
    coconut: '<circle cx="12" cy="13" r="8" fill="#7a4a2b"/><circle cx="12" cy="13" r="5" fill="#8f5a35"/><g fill="#3a2410"><circle cx="10" cy="11" r="1"/><circle cx="14" cy="11" r="1"/><circle cx="12" cy="14" r="1"/></g>',
    pineapple: '<path d="M12 2c1 2 3 3 3 5-1 0-2-1-3-1s-2 1-3 1c0-2 2-3 3-5z" fill="#3f7d1f"/><path d="M8 6c1 1 2 1 4 1s3 0 4-1c1 1 1 2 0 3-1-1-2-1-4-1s-3 0-4 1c-1-1-1-2 0-3z" fill="#4a8b2c"/><ellipse cx="12" cy="15" rx="6" ry="7" fill="#e8b53a"/><g stroke="#a9791a" stroke-width="0.9"><path d="M8 12l8 6M16 12l-8 6M12 9v13"/></g>',
    apple: '<path d="M12 8c-1-1-3-1.5-4.5-.5C5 8.5 4.5 12 6 16c1 2.5 2.5 4 4 4 .8 0 1.3-.4 2-.4s1.2.4 2 .4c1.5 0 3-1.5 4-4 1.5-4 1-7.5-1.5-8.5C15 6.5 13 7 12 8z" fill="#e0392b"/><path d="M12 8V5c0-1.5 1.5-2.5 3-2.5-.2 1.8-1.3 3.3-3 3.5z" fill="#4a8b2c"/>',
    pear: '<path d="M12 5c1.5 0 2.5 1.5 2 3-.3 1 .3 1.8 1 2.8 1.2 1.7 2 3.4 2 5.2 0 3-2.2 5-5 5s-5-2-5-5c0-1.8.8-3.5 2-5.2.7-1 1.3-1.8 1-2.8-.5-1.5.5-3 2-3z" fill="#b5cc3a"/><path d="M12 5V3" stroke="#6b5a12" stroke-width="1.4" stroke-linecap="round"/><path d="M12 4c1-1 2.5-1 3.5 0-1 1-2.5 1-3.5 0z" fill="#4a8b2c"/>',
    peach: '<circle cx="12" cy="14" r="7.5" fill="#f6a09a"/><path d="M12 6.5c0 3 0 6 0 8" stroke="#e07b74" stroke-width="1.2" fill="none"/><path d="M12 7c1-2 3-3 5-3-1 2-3 3-5 3z" fill="#4a8b2c"/>',
    plum: '<ellipse cx="12" cy="13.5" rx="7" ry="8" fill="#5e3a6e"/><path d="M12 5.5v8" stroke="#3f2650" stroke-width="1.1" fill="none"/><path d="M12 6c1-2 3-2 4-1-1 2-3 2-4 1z" fill="#4a8b2c"/>',
    kiwi: '<circle cx="12" cy="13" r="8" fill="#8a5a2b"/><circle cx="12" cy="13" r="6" fill="#7cae3a"/><circle cx="12" cy="13" r="2" fill="#eef3d8"/><g fill="#2c2c2c"><circle cx="12" cy="8.5" r="0.6"/><circle cx="15.5" cy="11" r="0.6"/><circle cx="14.5" cy="15.5" r="0.6"/><circle cx="9.5" cy="15.5" r="0.6"/><circle cx="8.5" cy="11" r="0.6"/></g>',
    avocado: '<path d="M12 4c1.5 0 2.5 1.5 2 3 2 1 3.5 3.5 3.5 6.5 0 3.5-2.5 6-5.5 6s-5.5-2.5-5.5-6c0-3 1.5-5.5 3.5-6.5-.5-1.5.5-3 2-3z" fill="#4a7a2c"/><path d="M12 8c-2 1-3 3-3 5.5S10.5 18 12 18s3-2 3-4.5S14 9 12 8z" fill="#c9e0a0"/><circle cx="12" cy="14" r="2.2" fill="#7a4a2b"/>',
    olive: '<path d="M4 8c4 1 7 3 9 6M4 8l1 2" stroke="#5a7a2c" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="13" cy="15" rx="3" ry="4" fill="#6b7d2c" transform="rotate(20 13 15)"/><ellipse cx="8" cy="11" rx="2.4" ry="3.2" fill="#8a9a3a" transform="rotate(20 8 11)"/>',
    datepalm: '<path d="M12 3c-3 1-5 3-6 6 2-1 4-1 6-1s4 0 6 1c-1-3-3-5-6-6z" fill="#4a8b2c"/><g fill="#8a4a1e"><ellipse cx="12" cy="14" rx="1.6" ry="2.6"/><ellipse cx="9" cy="15" rx="1.6" ry="2.6"/><ellipse cx="15" cy="15" rx="1.6" ry="2.6"/><ellipse cx="10.5" cy="18" rx="1.6" ry="2.6"/><ellipse cx="13.5" cy="18" rx="1.6" ry="2.6"/></g>',
    lychee: '<circle cx="12" cy="14" r="7.5" fill="#c0392b"/><g fill="#8e2f22"><circle cx="9" cy="11" r="1.1"/><circle cx="12" cy="10" r="1.1"/><circle cx="15" cy="11" r="1.1"/><circle cx="9" cy="14" r="1.1"/><circle cx="12" cy="14" r="1.1"/><circle cx="15" cy="14" r="1.1"/><circle cx="10.5" cy="17" r="1.1"/><circle cx="13.5" cy="17" r="1.1"/></g><path d="M12 6.5V4" stroke="#4a8b2c" stroke-width="1.4" stroke-linecap="round"/>',
    dragonfruit: '<ellipse cx="12" cy="13" rx="6.5" ry="8" fill="#e0397e"/><g fill="#7cae3a"><path d="M7 8l-2-1 2 2zM17 8l2-1-2 2zM6 14l-2 0 2 1.5zM18 14l2 0-2 1.5zM12 5l0-2 1.5 2z"/></g><path d="M9 12c1 1 1.5 3 1 5M15 12c-1 1-1.5 3-1 5M12 11v7" stroke="#c02866" stroke-width="0.9" fill="none"/>',
    berry: '<g fill="#4a2d5e"><circle cx="9" cy="14" r="3"/><circle cx="15" cy="14" r="3"/><circle cx="12" cy="17" r="3"/></g><path d="M9 11l3-5 3 5" stroke="#4a8b2c" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
    strawberry: '<path d="M12 8c-2 0-4 1-5 3-1.5 3 0 8 5 9 5-1 6.5-6 5-9-1-2-3-3-5-3z" fill="#e0392b"/><path d="M8 6c1 1 2.5 1.5 4 1.5S15 7 16 6c-.5 2-2 3-4 3s-3.5-1-4-3z" fill="#4a8b2c"/><g fill="#f7e08a"><circle cx="10" cy="12" r="0.5"/><circle cx="13" cy="13" r="0.5"/><circle cx="11" cy="15" r="0.5"/><circle cx="14" cy="16" r="0.5"/></g>',

    // ---- Category fallbacks ----
    catFruit: '<circle cx="12" cy="14" r="7" fill="#e0655b"/><path d="M12 7V4c0-1 1.5-2 3-1.5-.3 1.6-1.4 3-3 3z" fill="#4a8b2c"/>',
    catPalm: '<path d="M12 8c-3-3-7-3-9-1 3 0 5 1 7 3M12 8c3-3 7-3 9-1-3 0-5 1-7 3M12 8c0-4-2-6-5-7 2 3 3 5 3 7M12 8c0-4 2-6 5-7-2 3-3 5-3 7" stroke="#4a8b2c" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M11.5 8h1l1 13h-3z" fill="#8a5a2b"/>',
    catFicus: '<circle cx="12" cy="9" r="6" fill="#3f8b3f"/><path d="M11 15h2v3h-2z" fill="#8a5a2b"/><path d="M8 18h8l-1 3H9z" fill="#c98a4a"/>',
    catFlowering: '<g fill="#e86aa0"><circle cx="12" cy="7" r="2.5"/><circle cx="8" cy="10" r="2.5"/><circle cx="16" cy="10" r="2.5"/><circle cx="9.5" cy="14" r="2.5"/><circle cx="14.5" cy="14" r="2.5"/></g><circle cx="12" cy="11" r="2.2" fill="#f7d02c"/><path d="M12 16v5" stroke="#4a8b2c" stroke-width="1.6" stroke-linecap="round"/>',
    catGroundCover: '<g fill="#4a8b2c"><path d="M6 20c0-3 1-5 2-6-2 1-4 3-4 6zM12 20c0-4 1-6 2-8-2 2-4 4-4 8zM18 20c0-3-1-5-2-6 2 1 4 3 4 6z"/></g><path d="M3 20h18" stroke="#6b4a2a" stroke-width="1.4" stroke-linecap="round"/>',
    catBorder: '<g fill="#5aa03a"><circle cx="7" cy="12" r="3"/><circle cx="12" cy="10" r="3.5"/><circle cx="17" cy="12" r="3"/></g><path d="M4 20h16" stroke="#6b4a2a" stroke-width="1.6" stroke-linecap="round"/><path d="M7 15v5M12 13.5v6.5M17 15v5" stroke="#3f7d1f" stroke-width="1.2"/>',
    catEvergreen: '<path d="M12 3l4 6h-2.5l3 5H14l3 5H7l3-5H7.5l3-5H8z" fill="#2f7d4f"/><path d="M11 19h2v3h-2z" fill="#8a5a2b"/>',
    catShading: '<circle cx="12" cy="9" r="7" fill="#3f8b3f"/><circle cx="8" cy="11" r="4" fill="#4a9b4a"/><circle cx="16" cy="11" r="4" fill="#4a9b4a"/><path d="M11 14h2v7h-2z" fill="#8a5a2b"/>',
    catHedge: '<rect x="4" y="8" width="16" height="10" rx="3" fill="#3f8b3f"/><g fill="#4a9b4a"><circle cx="8" cy="9" r="2.5"/><circle cx="12" cy="8" r="2.5"/><circle cx="16" cy="9" r="2.5"/></g><path d="M4 18h16v2H4z" fill="#2f6b2f"/>',
    catDecorative: '<path d="M12 4c-2 3-3 5-3 7a3 3 0 006 0c0-2-1-4-3-7z" fill="#5aa03a"/><path d="M11 12h2v4h-2z" fill="#8a5a2b"/><path d="M7 16h10l-1 4H8z" fill="#c07a3a"/>',
    leaf: '<path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16z" fill="#4a8b2c"/><path d="M6 18C10 12 14 8 18 6" stroke="#2f6b1f" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
  };

  var CATEGORY = {
    'Fruit': 'catFruit',
    'Palm': 'catPalm',
    'Ficus': 'catFicus',
    'Flowering Tree': 'catFlowering',
    'Ground Cover': 'catGroundCover',
    'Border Plants': 'catBorder',
    'Evergreen': 'catEvergreen',
    'Shading Tree': 'catShading',
    'Outdoor Hedge': 'catHedge',
    'Decorative': 'catDecorative'
  };

  // Exact plant name -> icon key
  var NAME = {
    'mango': 'mango',
    'banana': 'banana',
    'guava': 'guava', 'strawberry guava': 'guava',
    'pomegranate': 'pomegranate', 'pomegranate dwarf': 'pomegranate', 'pomegranate sweet': 'pomegranate',
    'grape': 'grape',
    'citrus': 'citrus', 'orange': 'citrus', 'lemon': 'citrus', 'lime': 'citrus',
    'kinnow': 'citrus', 'tangerine': 'citrus', 'grapefruit': 'citrus', 'pomelo': 'citrus',
    'kumquat': 'citrus', 'calamondin': 'citrus',
    'papaya': 'papaya',
    'fig': 'fig',
    'coconut': 'coconut',
    'pineapple': 'pineapple',
    'apple': 'apple', 'wood apple': 'apple', 'custard apple': 'apple', 'rose apple': 'apple', 'water apple': 'apple',
    'pear': 'pear',
    'peach': 'peach', 'apricot': 'peach',
    'plum': 'plum',
    'kiwi': 'kiwi',
    'avocado': 'avocado',
    'olive': 'olive',
    'date palm fruit': 'datepalm',
    'lychee': 'lychee', 'rambutan': 'lychee',
    'dragon fruit': 'dragonfruit',
    'jamun': 'berry', 'mulberry': 'berry', 'phalsa': 'berry', 'karonda': 'berry', 'ber': 'berry', 'jujube': 'berry'
  };

  function wrap(inner, cls) {
    return '<svg viewBox="0 0 24 24" class="' + (cls || 'plant-icon-svg') +
      '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  function keyFor(name, category) {
    var n = String(name || '').trim().toLowerCase();
    if (NAME[n]) return NAME[n];
    if (CATEGORY[category]) return CATEGORY[category];
    return 'leaf';
  }

  function getIcon(name, category, cls) {
    var key = keyFor(name, category);
    return wrap(I[key] || I.leaf, cls);
  }

  window.PLANT_ICONS = { getIcon: getIcon };
})();
