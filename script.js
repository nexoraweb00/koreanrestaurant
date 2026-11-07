
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('loaded');
  }, 900);
});

const dot  = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  dot.style.left = mx + 'px';
  dot.style.top  = my + 'px';
});

function animateRing() {
  rx += (mx - rx) * 0.18;
  ry += (my - ry) * 0.18;
  ring.style.left = rx + 'px';
  ring.style.top  = ry + 'px';
  requestAnimationFrame(animateRing);
}
animateRing();

document.querySelectorAll('a, button, input, select, textarea, .g-card').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});

const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

const petalsContainer = document.getElementById('petals');
const PETAL_COUNT = 22;

for (let i = 0; i < PETAL_COUNT; i++) {
  const p = document.createElement('div');
  p.className = 'petal';
  const left   = Math.random() * 100;
  const dur    = 10 + Math.random() * 14;
  const delay  = -Math.random() * dur;
  const size   = 0.5 + Math.random() * 0.9;

  p.style.left = left + 'vw';
  p.style.animationDuration = dur + 's';
  p.style.animationDelay = delay + 's';
  p.style.transform = `scale(${size})`;
  p.style.opacity = 0.4 + Math.random() * 0.5;

  petalsContainer.appendChild(p);
}

const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
     
      entry.target.classList.add('visible');
    } else {
       entry.boundingClientRect.top > 0 ? entry.target.classList.remove('visible') : null;
     
      if (entry.boundingClientRect.top > 0) {
        entry.target.classList.remove('visible');
      }
    }
  });
}, { 
  threshold: 0.15,
  rootMargin: "0px 0px -50px 0px" 
});

document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => io.observe(el));

document.querySelectorAll('.menu-panel, .gallery-grid, .about-stats').forEach(container => {
  container.classList.add('stagger-container');
  const items = container.querySelectorAll('.menu-item, .g-card, .stat');
  items.forEach((item, index) => {
    item.classList.add('stagger-item');
    item.style.setProperty('--i', index);
  });
  io.observe(container);
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setTimeout(() => {
      const activePanel = document.querySelector('.menu-panel.active');
      if(activePanel) {
        activePanel.classList.remove('visible');
        void activePanel.offsetWidth; 
        activePanel.classList.add('visible');
      }
    }, 50);
  });
});

const tabBtns = document.querySelectorAll('.tab-btn');
const panels  = document.querySelectorAll('.menu-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    panels.forEach(p => p.classList.remove('active'));
    const activePanel = document.querySelector(`.menu-panel[data-panel="${tab}"]`);
    if (activePanel) {
      activePanel.classList.add('active');
    }
  });
});

const heroMoon = document.querySelector('.hero-moon');
window.addEventListener('scroll', () => {
  if (window.scrollY < window.innerHeight) {
    heroMoon.style.transform = `translateX(-50%) translateY(${window.scrollY * 0.25}px)`;
  }
});

const reserveForm = document.getElementById('reserveForm');

if(reserveForm) {
  reserveForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = reserveForm.querySelector('button');
    btn.innerText = "Reserving...";
    btn.disabled = true;

    try {
      const { db, collection, addDoc } = window.firebaseDB;

      const resData = {
        userId: window.currentUser ? window.currentUser.uid : "guest",
        name: document.getElementById('resName').value,
        phone: document.getElementById('resPhone').value,
        date: document.getElementById('resDate').value,
        time: document.getElementById('resTime').value,
        guests: document.getElementById('resGuests').value,
        email: document.getElementById('resEmail').value || 'No email',
        note: document.getElementById('resNote').value || 'None',
        status: "Pending",
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, "reservations"), resData);
      
      window.location.href = `reservation-success.html?id=${docRef.id}`;

    } catch (error) {
      alert("Error: " + error.message);
      btn.innerText = "Reserve a Table";
      btn.disabled = false;
    }
  });
}

async function loadBanner() {
  if(!window.firebaseDB) return;
  const { db, collection, getDocs } = window.firebaseDB;
  
  const snap = await getDocs(collection(db, "banners"));
  if(!snap.empty) {
    const banners = [];
    snap.forEach(doc => banners.push(doc.data()));
    
    const latestBanner = banners[banners.length - 1]; 
    
    document.getElementById('offerBannerText').innerText = latestBanner.text;
    document.getElementById('offerBannerLink').href = latestBanner.link;
    document.getElementById('offerBanner').style.display = 'block';
  }
}
setTimeout(loadBanner, 1500);

async function loadGallery() {
  if(!window.firebaseDB) return;
  const { db, collection, getDocs } = window.firebaseDB;
  const grid = document.getElementById('galleryGrid');
  if(!grid) return;

  const snap = await getDocs(collection(db, "gallery"));
  grid.innerHTML = ""; 

  if (snap.empty) {
    grid.innerHTML = "<p style='color:white;'>No images yet.</p>";
    return;
  }

  snap.forEach(doc => {
    const data = doc.data();
    grid.innerHTML += `
      <div class="gallery-item">
        <img src="${data.image}" alt="${data.title}">
        <div class="gallery-overlay">
          <h3>${data.title}</h3>
          <p>${data.subtitle}</p>
        </div>
      </div>
    `;
  });
}
setTimeout(loadGallery, 1500);

setTimeout(() => {
  if (!window.currentUser || !window.firebaseDB) return;
  
  const { db, collection, query, where, onSnapshot } = window.firebaseDB;
  
  const q = query(
    collection(db, "notifications"), 
    where("userId", "==", window.currentUser.uid),
    where("isRead", "==", false)
  );

  onSnapshot(q, (snapshot) => {
    snapshot.forEach(async (docSnap) => {
      const notif = docSnap.data();
      
      const toast = document.createElement('div');
      toast.style.cssText = `
        background: #792deb; border: 1px solid var(--gold); border-left: 5px solid var(--gold);
        color: var(--cream); padding: 15px 20px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        min-width: 300px; animation: slideIn 0.5s ease forwards; font-family: var(--font-sans);
      `;
      toast.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h4 style="color: var(--gold); margin-bottom: 5px; font-family: var(--font-serif);">Update on your order</h4>
            <p style="font-size: 0.9rem;">${notif.message}</p>
          </div>
          <button style="background:none; border:none; color:#888; cursor:pointer; font-size:1.2rem;" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
      `;
      document.getElementById('toastContainer').appendChild(toast);

      await updateDoc(doc(db, "notifications", docSnap.id), { isRead: true });

      setTimeout(() => { if(toast.parentElement) toast.remove(); }, 10000);
    });
  });
}, 3000); 

async function loadMenuFromFirebase() {

  if (!window.firebaseDB) {
    setTimeout(loadMenuFromFirebase, 500);
    return;
  }

  const { db, collection, getDocs } = window.firebaseDB;

  try {
    const querySnapshot = await getDocs(collection(db, "menu"));
    
    const panels = {
      appetizers: document.getElementById('panel-appetizers'),
      mains: document.getElementById('panel-mains'),
      desserts: document.getElementById('panel-desserts'),
      drinks: document.getElementById('panel-drinks')
    };

    for (let key in panels) {
      if (panels[key]) panels[key].innerHTML = "";
    }

    let emptyCheck = { appetizers: true, mains: true, desserts: true, drinks: true };

    querySnapshot.forEach((doc) => {
      const dish = doc.data();
      const docId = doc.id;

      let badgeHtml = dish.badge ? `<div class="card-badge">${dish.badge}</div>` : "";

      const cardHTML = `
        <a href="order.html?id=${docId}" class="menu-card" style="text-decoration: none; color: inherit; display: flex; flex-direction: column;">
          <div class="card-img">
            ${badgeHtml}
            <img src="${dish.image}" alt="${dish.name_en}">
          </div>
          <div class="card-content">
            <h3 class="card-title">${dish.name_kr} <span class="en">${dish.name_en}</span></h3>
            <p class="card-desc">${dish.desc}</p>
            <div class="card-footer">
              <span class="card-price">Rs. ${dish.price}</span>
              <button class="card-btn" style="pointer-events: none;">+</button>
            </div>
          </div>
        </a>
      `;

      if (panels[dish.category]) {
        panels[dish.category].innerHTML += cardHTML;
        emptyCheck[dish.category] = false;
      }
    });

    for (let key in panels) {
      if (panels[key] && emptyCheck[key]) {
        panels[key].innerHTML = `<p style="color: var(--text-dim); grid-column: 1/-1; text-align: center;">No items available in this category yet.</p>`;
      }
    }

  } catch (error) {
    console.error("Error loading menu: ", error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadMenuFromFirebase();
});

async function loadBannersToFrontend() {
  if (!window.firebaseDB) {
    setTimeout(loadBannersToFrontend, 500);
    return;
  }

  const { db, collection, getDocs } = window.firebaseDB;
  const bannerSection = document.getElementById('bannerSection');
  const bannerSlider = document.getElementById('bannerSlider');

  try {
    const querySnapshot = await getDocs(collection(db, "banners"));
    
    if (querySnapshot.empty) {
      bannerSection.style.display = 'none'; 
      return;
    }

    let bannerHTML = "";

    querySnapshot.forEach((doc) => {
      const banner = doc.data();
      if (banner.image) {
        bannerHTML += `
          <a href="offer.html?id=${doc.id}" class="banner-card" style="text-decoration: none;">
            <img src="${banner.image}" alt="Banner">
          </a>
        `;
      }
    });

    if (bannerHTML !== "") {
     
      bannerSlider.innerHTML = `
        <div class="banner-track">
          ${bannerHTML}
          ${bannerHTML}
        </div>
      `;
      bannerSection.style.display = 'block'; 
    }

  } catch (error) {
    console.error("Error loading banners:", error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadBannersToFrontend();
});

function listenToNotifications() {
  if (!window.currentUser || !window.firebaseDB) {
    setTimeout(listenToNotifications, 1000);
    return;
  }

  const { db, collection, query, where, onSnapshot } = window.firebaseDB;
  const notifBtn = document.getElementById('navNotifBtn');
  const badge = document.getElementById('notifBadge');

  if (notifBtn) notifBtn.style.display = 'flex'; 

  const q = query(
    collection(db, "notifications"), 
    where("userId", "==", window.currentUser.uid),
    where("isRead", "==", false)
  );

  onSnapshot(q, (snapshot) => {
    const count = snapshot.size;
    if (count > 0) {
      badge.innerText = count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  });
}
