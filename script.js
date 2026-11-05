const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Content stays visible when JavaScript or IntersectionObserver is unavailable.
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  document.documentElement.classList.add('js-motion');
}

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
}
menuButton.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', event => {
  if (!event.target.closest('.header')) closeMenu();
});
window.matchMedia('(max-width: 960px)').addEventListener('change', closeMenu);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = navigation.querySelector(`a[href="#${entry.target.id}"]`);
      if (!link) return;
      link.classList.toggle('active', entry.isIntersecting);
      if (entry.isIntersecting) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-15% 0px -65% 0px' });
  document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));
}

// Verified real locations; the scenarios are fictional, not crime reports.
// Leaflet uses [latitude, longitude]. Sources are linked in each place card.
const demoPoints = {
  school: {
    number: '01',
    title: 'Smart Technological School',
    address: 'Астана, Ілияс Омаров көшесі, 8',
    coordinates: [51.1367596, 71.3706491],
    source: 'https://www.openstreetmap.org/way/916153716',
    description: 'Мектеп ортасына арналған ойдан шығарылған оқу мысалы: сабақтан кейін бір оқушыдан ақша талап етіп, қорқытады. Мұны «балалардың өз мәселесі» деп қалдыруға болмайды. Бұл аталған мектепте болған оқиға туралы мәлімет емес.',
    types: ['Мысал: қорқыту', 'Мысал: ақша талап ету', 'Мысал: буллинг'],
    advice: 'Қауіпсіз жерге барыңыз. Сенімді ересекке, мұғалімге немесе мектеп психологына айтыңыз. Хабарламалар болса, сақтаңыз; жанжалды жалғыз шешуге тырыспаңыз.'
  },
  lane: {
    number: '02',
    title: 'Нұра тұйық көшесі',
    address: 'Астана, Көктал шағынауданы, Нұра тұйық көшесі',
    coordinates: [51.191580, 71.325704],
    source: 'https://yandex.kz/maps/ru/163/astana/geo/nura_tuyyq_koshesi/24203020/',
    description: 'Көше ортасына арналған ойдан шығарылған оқу мысалы: өтіп бара жатқан адамның телефонын тартып алуға әрекет жасалады. Бұл осы көшеде тіркелген оқиға емес және көшенің қауіпті екенін білдірмейді.',
    types: ['Мысал: мүлікке қол сұғу', 'Мысал: қорқыту', 'Мысал: күш қолдану'],
    advice: 'Қарсыласу қаупін бағалап, қауіпсіздікке басымдық беріңіз. Адамдар бар жарық жерге шығыңыз. Қауіпсіз болғанда полицияға оқиғаның орнын, уақытын және белгілерін хабарлаңыз.'
  },
  club: {
    number: '03',
    title: 'Cyber Point',
    address: 'Астана, Дінмұхамед Қонаев көшесі, 14',
    coordinates: [51.128028, 71.436792],
    source: 'https://yandex.kz/maps/ru/org/cyber_point/132911721211/',
    description: 'Компьютерлік клуб ортасына арналған ойдан шығарылған оқу мысалы: ортақ компьютерде ойын аккаунты ашық қалып, бөтен адам оған кіріп, ақылы заттарды иемденеді. Бұл Cyber Point клубында болған оқиға туралы мәлімет емес.',
    types: ['Мысал: аккаунтқа рұқсатсыз кіру', 'Мысал: онлайн алаяқтық', 'Мысал: заттың жоғалуы'],
    advice: 'Қоғамдық компьютерде құпиясөзді сақтамаңыз және сессиядан шығыңыз. Екі факторлы қорғауды қосыңыз. Оқиға болса, әкімшіге хабарлап, платформадағы кіру тарихы мен төлем деректерін сақтаңыз.'
  }
};
const mapContainer = document.querySelector('#astana-map');
const mapStatus = document.querySelector('#map-status');
const placeButtons = document.querySelectorAll('[data-point]');
const pointNumber = document.querySelector('#point-number');
const pointTitle = document.querySelector('#point-title');
const pointDescription = document.querySelector('#point-description');
const pointLocation = document.querySelector('#point-location');
const pointSource = document.querySelector('#point-source');
const pointTypes = document.querySelector('#point-types');
const pointAdvice = document.querySelector('#point-advice');
const initialMapContent = {
  number: pointNumber.textContent,
  title: pointTitle.textContent,
  description: pointDescription.textContent,
  types: [...pointTypes.children].map(item => item.textContent),
  advice: pointAdvice.textContent
};
let cityMap;
let mapStarted = false;
const markers = new Map();

function renderMapInfo(point) {
  pointNumber.textContent = point.number;
  pointTitle.textContent = point.title;
  pointDescription.textContent = point.description;
  pointLocation.textContent = point.address || '';
  pointLocation.hidden = !point.address;
  pointSource.hidden = !point.source;
  if (point.source) pointSource.href = point.source;
  else pointSource.removeAttribute('href');
  pointAdvice.textContent = point.advice;
  pointTypes.replaceChildren(...point.types.map(type => {
    const tag = document.createElement('span');
    tag.textContent = type;
    return tag;
  }));
}

function updateMapSelection(selectedKey) {
  placeButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.point === selectedKey));
  });
  markers.forEach((marker, key) => {
    const element = marker.getElement();
    element.classList.toggle('is-active', key === selectedKey);
    element.setAttribute('aria-pressed', String(key === selectedKey));
    marker.setZIndexOffset(key === selectedKey ? 1000 : 0);
  });
}

function selectPlace(key) {
  const point = demoPoints[key];
  if (!point) return;
  initializeMap();
  renderMapInfo(point);
  updateMapSelection(key);
  if (cityMap) {
    cityMap.stop();
    cityMap.flyTo(point.coordinates, 16, { animate: !reducedMotion.matches, duration: 1.1 });
  }
}

function showOverview() {
  if (!cityMap) return;
  cityMap.stop();
  cityMap.fitBounds(Object.values(demoPoints).map(point => point.coordinates), {
    padding: [45, 45], maxZoom: 13, animate: !reducedMotion.matches
  });
}

function initializeMap() {
  if (mapStarted) return;
  mapStarted = true;
  if (!window.L) {
    mapStatus.textContent = 'Карта кітапханасы жүктелмеді. Оқу мысалдарын батырмалардан таңдауға немесе картаны бөлек ашуға болады.';
    return;
  }
  const L = window.L;
  cityMap = L.map(mapContainer, { scrollWheelZoom: false, attributionControl: true })
    .setView([51.1605, 71.4378], 13);
  cityMap.zoomControl.setPosition('topright');
  const zoomButtons = mapContainer.querySelectorAll('.leaflet-control-zoom a');
  zoomButtons.forEach((button, index) => {
    const label = index === 0 ? 'Картаны жақындату' : 'Картаны алыстату';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
  });
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
  });
  const openedAsFile = window.location.protocol === 'file:';
  const launchNote = document.querySelector('#map-launch-note');
  launchNote.hidden = !openedAsFile;
  let successfulTiles = 0;
  let failedTiles = 0;
  tiles.on('loading', () => {
    successfulTiles = 0;
    failedTiles = 0;
    mapStatus.hidden = false;
    mapStatus.textContent = 'Карта жүктелуде…';
  });
  tiles.on('tileload', () => { successfulTiles++; });
  tiles.on('tileerror', () => {
    failedTiles++;
    mapStatus.hidden = false;
    mapStatus.textContent = 'Карта сервері суреттерді жүктемеді. Интернетті тексеріңіз. Access blocked болса, сайтты START.cmd арқылы ашыңыз. Оқу мысалдары қолжетімді.';
  });
  tiles.on('load', () => {
    mapStatus.hidden = failedTiles === 0 && successfulTiles > 0;
  });
  // Local file pages cannot supply the HTTP Referer required by OSM.
  // Do not request blocked tiles repeatedly; serve the site over HTTP instead.
  if (openedAsFile) {
    mapStatus.hidden = false;
    mapStatus.textContent = 'Картаны жүктеу үшін START.cmd арқылы ашыңыз. Нұсқаулық картаның үстінде көрсетілген.';
  } else {
    tiles.addTo(cityMap);
  }
  Object.entries(demoPoints).forEach(([key, point]) => {
    const marker = L.marker(point.coordinates, {
      icon: L.divIcon({
        className: 'location-marker',
        html: `<span>${point.number}</span>`,
        iconSize: [44, 44], iconAnchor: [22, 22]
      }),
      title: point.title,
      alt: point.title,
      keyboard: true,
      riseOnHover: true
    }).addTo(cityMap);
    marker.on('click', () => selectPlace(key));
    marker.getElement().setAttribute('aria-pressed', 'false');
    markers.set(key, marker);
  });
  showOverview();
  window.addEventListener('online', () => tiles.redraw());
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => cityMap.invalidateSize({ pan: false })).observe(mapContainer);
  }
}

placeButtons.forEach(button => {
  button.addEventListener('click', () => selectPlace(button.dataset.point));
});
document.querySelector('#map-reset').addEventListener('click', () => {
  initializeMap();
  showOverview();
  updateMapSelection(null);
  renderMapInfo(initialMapContent);
});

// Load tiles near the map, without prefetching or downloading an offline region.
if ('IntersectionObserver' in window) {
  const mapObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      initializeMap();
      mapObserver.disconnect();
    }
  }, { rootMargin: '250px' });
  mapObserver.observe(mapContainer);
} else {
  initializeMap();
}

const contactsButton = document.querySelector('#show-contacts');
const contacts = document.querySelector('#contacts');
contactsButton.addEventListener('click', () => {
  const expanded = contactsButton.getAttribute('aria-expanded') !== 'true';
  contactsButton.setAttribute('aria-expanded', String(expanded));
  contactsButton.firstChild.textContent = expanded
    ? 'Байланыс нөмірлерін жасыру '
    : 'Байланыс нөмірлерін көрсету ';
  contacts.hidden = !expanded;
  if (expanded) contacts.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
});
