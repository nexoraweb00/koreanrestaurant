import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxjDMZGVPRfx1altzXvwNKnu9sjdfk8kk",
  authDomain: "korean-cafe-b26a8.firebaseapp.com",
  projectId: "korean-cafe-b26a8",
  storageBucket: "korean-cafe-b26a8.firebasestorage.app",
  messagingSenderId: "823464413100",
  appId: "1:823464413100:web:444b9b7bdf37826de89c09",
  measurementId: "G-ZDPWRWL54R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const statusMsg = document.getElementById('statusMsg');
const showMsg = (msg, isError = false) => { 
  statusMsg.innerText = msg; 
  statusMsg.style.background = isError ? '#ef4444' : '#10b981';
  statusMsg.style.display = 'block'; 
  setTimeout(() => statusMsg.style.display = 'none', 3000); 
};

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});

async function uploadToCloudinary(file) {
  if (!file) return null;

  const cloudName = "motpipab"; 
  const uploadPreset = "korean-cafe"; 

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    return data.secure_url; 
  } catch (error) {
    console.error("Upload failed", error);
    alert("Failed to upload image.");
    return null;
  }
}

const ordersBody = document.getElementById('ordersBody');

onSnapshot(collection(db, "orders"), (snapshot) => {
  ordersBody.innerHTML = "";
  
  if(snapshot.empty) { 
    ordersBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No orders yet.</td></tr>"; 
    return; 
  }

  let orders = [];
  snapshot.forEach(d => orders.push({ id: d.id, ...d.data() }));
  
  orders.sort((a, b) => {
    const timeA = a.orderDate && a.orderDate.toMillis ? a.orderDate.toMillis() : 0;
    const timeB = b.orderDate && b.orderDate.toMillis ? b.orderDate.toMillis() : 0;
    return timeB - timeA;
  });

  orders.forEach(o => {
    let action = "";
    if (o.status === "Pending") {
      action = `
        <div class="action-group">
          <button class="action-btn btn-accept" data-id="${o.id}" data-user="${o.userId}" data-dish="${o.dishName}">Accept</button>
          <button class="action-btn btn-reject" data-id="${o.id}" data-user="${o.userId}" data-dish="${o.dishName}">Reject</button>
        </div>
      `;
    } else if (o.status === "Accepted") {
      action = `<span style="color: #10b981; font-weight: bold;">Accepted ✅</span>`;
    } else {
      action = `<span style="color: #ef4444; font-weight: bold;">Rejected ❌</span>`;
    }

    ordersBody.innerHTML += `
      <tr>
        <td>
          <strong>${o.userEmail || 'No Email'}</strong><br>
          <small>${o.phone || 'No phone'}</small>
        </td>
        <td>${o.quantity} x ${o.dishName}<br><small>${o.price} | ${o.paymentMethod}</small></td>
        <td>${o.address || 'No address'}</td>
        <td>${o.status}</td>
        <td>${action}</td>
      </tr>`;
  });
});

document.addEventListener('click', async (e) => {

  if (e.target.classList.contains('btn-accept')) {
    const id = e.target.getAttribute('data-id');
    const user = e.target.getAttribute('data-user');
    const dish = e.target.getAttribute('data-dish');
    
    if(confirm("Accept this order?")) {
      try {
        await updateDoc(doc(db, "orders", id), { status: "Accepted" });
        await addDoc(collection(db, "notifications"), {
          userId: user, message: `Your order for ${dish} has been accepted! 🎉`, isRead: false, createdAt: new Date()
        });
        showMsg("Order Accepted!");
      } catch (error) { alert("Error: " + error.message); }
    }
  }
  
  if (e.target.classList.contains('btn-reject')) {
    const id = e.target.getAttribute('data-id');
    const user = e.target.getAttribute('data-user');
    const dish = e.target.getAttribute('data-dish');
    
    if(confirm("Reject this order?")) {
      try {
        await updateDoc(doc(db, "orders", id), { status: "Rejected" });
        await addDoc(collection(db, "notifications"), {
          userId: user, message: `Sorry, your order for ${dish} has been rejected.`, isRead: false, createdAt: new Date()
        });
        showMsg("Order Rejected!", true);
      } catch (error) { alert("Error: " + error.message); }
    }
  }
});

window.acceptOrder = async (orderId, userId, dishName) => {
  if(!confirm("Accept this order?")) return;
  try {
    await updateDoc(doc(db, "orders", orderId), { status: "Accepted" });
    await addDoc(collection(db, "notifications"), {
      userId: userId, message: `Your order for ${dishName} has been accepted! 🎉`, isRead: false, createdAt: new Date()
    });
    showMsg("Order Accepted!");
  } catch (e) { showMsg("Error: " + e.message, true); }
};

const menuForm = document.getElementById('menuForm');
let editMenuId = null;

async function loadMenu() {
  const snap = await getDocs(collection(db, "menu"));
  const tbody = document.getElementById('menuListBody');
  tbody.innerHTML = snap.empty ? "<tr><td colspan='5'>No items found.</td></tr>" : "";
  snap.forEach(d => {
    const i = d.data();
    tbody.innerHTML += `
      <tr>
        <td><img src="${i.image}" width="50" style="height:50px; object-fit:cover; border-radius:5px;"></td>
        <td>${i.name_kr} (${i.name_en})</td>
        <td>Rs. ${i.price}</td>
        <td>${i.category}</td>
        <td>
          <button class="action-btn btn-edit" onclick="window.editMenu('${d.id}')">Edit</button>
          <button class="action-btn btn-delete" onclick="window.deleteMenu('${d.id}')">Delete</button>
        </td>
      </tr>`;
  });
}
loadMenu();

menuForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('menuSubmitBtn');
  btn.innerText = "Saving...";
  try {
    const file = document.getElementById('foodImgFile').files[0];
    const urlInput = document.getElementById('foodImgUrl').value;
    let finalImg = urlInput || null;

    if (file) {
      finalImg = await uploadToCloudinary(file);
    }
    
    if (!finalImg && !editMenuId) throw new Error("Image is required");

    const data = {
      name_kr: document.getElementById('foodNameKr').value,
      name_en: document.getElementById('foodNameEn').value,
      price: Number(document.getElementById('foodPrice').value),
      category: document.getElementById('foodCategory').value,
      desc: document.getElementById('foodDesc').value,
      image: finalImg
    };

    if (editMenuId) {
      await updateDoc(doc(db, "menu", editMenuId), data);
      showMsg("Item Updated!"); editMenuId = null;
      document.getElementById('cancelEditBtn').style.display = "none";
      document.getElementById('menuSubmitBtn').innerText = "Add Food Item";
    } else {
      await addDoc(collection(db, "menu"), data);
      showMsg("Item Added!");
    }
    menuForm.reset(); loadMenu();
  } catch (e) { showMsg("Error: " + e.message, true); }
  finally { btn.innerText = editMenuId ? "Update Item" : "Add Food Item"; }
});

window.deleteMenu = async (id) => { if(confirm("Delete?")) { await deleteDoc(doc(db, "menu", id)); loadMenu(); } };
window.editMenu = async (id) => {
  const snap = await getDocs(collection(db, "menu"));
  snap.forEach(d => {
    if(d.id === id) {
      const i = d.data();
      document.getElementById('foodNameKr').value = i.name_kr;
      document.getElementById('foodNameEn').value = i.name_en;
      document.getElementById('foodPrice').value = i.price;
      document.getElementById('foodCategory').value = i.category;
      document.getElementById('foodDesc').value = i.desc;
      document.getElementById('foodImgUrl').value = i.image;
      editMenuId = id;
      document.getElementById('menuSubmitBtn').innerText = "Update Item";
      document.getElementById('cancelEditBtn').style.display = "block";
    }
  });
};
document.getElementById('cancelEditBtn').onclick = () => { editMenuId = null; menuForm.reset(); document.getElementById('menuSubmitBtn').innerText = "Add Food Item"; document.getElementById('cancelEditBtn').style.display = "none"; };

async function loadDishesForBanner() {
  const snap = await getDocs(collection(db, "menu"));
  const list = document.getElementById('bannerDishesList');
  list.innerHTML = "";
  snap.forEach(d => {
    const item = d.data();
    list.innerHTML += `
      <label style="display: block; margin-bottom: 5px; cursor: pointer;">
        <input type="checkbox" name="bannerDish" value="${d.id}"> ${item.name_en} (Rs. ${item.price})
      </label>
    `;
  });
}
loadDishesForBanner(); 

async function loadBanners() {
  try {
    const snap = await getDocs(collection(db, "banners"));
    const tbody = document.getElementById('bannerListBody');
    
    if (snap.empty) {
      tbody.innerHTML = "<tr><td colspan='4'>No banners found.</td></tr>";
      return;
    }
    
    tbody.innerHTML = ""; 
    
    snap.forEach(d => {
      const b = d.data();
      const dishCount = b.dishes ? b.dishes.length : 0;
      
      tbody.innerHTML += `
        <tr>
          <td>
            ${b.image ? `<img src="${b.image}" width="60" style="height:40px; object-fit:cover; border-radius:4px;">` : 'No Image'}
          </td>
          <td>${b.text || 'Special Offer'}</td>
          <td>${dishCount} Items Selected</td>
          <td>
            <button class="action-btn btn-delete" onclick="window.deleteBanner('${d.id}')">Delete</button>
          </td>
        </tr>`;
    });
  } catch (error) {

    document.getElementById('bannerListBody').innerHTML = `<tr><td colspan='4' style="color:red;">Error: ${error.message}</td></tr>`;
    console.error(error);
  }
}
loadBanners();

document.getElementById('bannerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.innerText = "Saving...";
  try {
    const file = document.getElementById('bannerImgFile').files[0];
    const urlInput = document.getElementById('bannerImgUrl').value;
    let finalImg = urlInput || null;

    if (file) finalImg = await uploadToCloudinary(file);

    const selectedDishes = [];
    document.querySelectorAll('input[name="bannerDish"]:checked').forEach(cb => {
      selectedDishes.push(cb.value);
    });

    await addDoc(collection(db, "banners"), { 
      text: document.getElementById('bannerText').value, 
      image: finalImg,
      dishes: selectedDishes,
      discount: Number(document.getElementById('bannerDiscount').value) || 0 //
    });
    
    showMsg("Banner Added!"); e.target.reset(); loadBanners();
  } catch(e) { showMsg("Error: " + e.message, true); }
  finally { btn.innerText = "Add Banner"; }
});

window.deleteBanner = async (id) => { if(confirm("Delete?")) { await deleteDoc(doc(db, "banners", id)); loadBanners(); } };

async function loadGallery() {
  const snap = await getDocs(collection(db, "gallery"));
  const tbody = document.getElementById('galleryListBody');
  tbody.innerHTML = snap.empty ? "<tr><td colspan='3'>No images.</td></tr>" : "";
  snap.forEach(d => {
    tbody.innerHTML += `<tr><td><img src="${d.data().image}" width="50" style="height:50px; object-fit:cover; border-radius:5px;"></td><td>${d.data().title}</td><td><button class="action-btn btn-delete" onclick="window.deleteGallery('${d.id}')">Delete</button></td></tr>`;
  });
}
loadGallery();

document.getElementById('galleryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.innerText = "Uploading...";
  try {
    const file = document.getElementById('galImgFile').files[0];
    const urlInput = document.getElementById('galImgUrl').value;
    let finalImg = urlInput || null;

    if (file) {
      finalImg = await uploadToCloudinary(file);
    }
    if (!finalImg) throw new Error("Image is required");

    await addDoc(collection(db, "gallery"), { 
      title: document.getElementById('galTitle').value, 
      subtitle: document.getElementById('galSubtitle').value, 
      image: finalImg 
    });
    showMsg("Image Added!"); e.target.reset(); loadGallery();
  } catch (e) { showMsg("Error: " + e.message, true); }
  finally { btn.innerText = "Add Image"; }
});
window.deleteGallery = async (id) => { if(confirm("Delete image?")) { await deleteDoc(doc(db, "gallery", id)); loadGallery(); } };

const reservationsBody = document.getElementById('reservationsBody');

onSnapshot(collection(db, "reservations"), (snapshot) => {
  if(!reservationsBody) return;
  
  reservationsBody.innerHTML = "";
  
  if(snapshot.empty) { 
    reservationsBody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No reservations yet.</td></tr>"; 
    return; 
  }

  let resList = [];
  snapshot.forEach(d => resList.push({ id: d.id, ...d.data() }));
  
  resList.sort((a, b) => {
    const timeA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });

  resList.forEach(r => {
    let action = "";
    
    if (r.status === "Pending" || !r.status) {
      action = `
        <div class="action-group">
          <button class="action-btn btn-accept-res" data-id="${r.id}" data-user="${r.userId || 'guest'}" data-name="${r.name || 'Guest'}">Accept</button>
          <button class="action-btn btn-reject-res" data-id="${r.id}" data-user="${r.userId || 'guest'}" data-name="${r.name || 'Guest'}">Reject</button>
        </div>
      `;
    } else {
      action = `<span style="color: #888;">-</span>`; 
    }

    let rejectReasonText = r.rejectionReason ? `<br><small style="color:#ef4444;">Reason: ${r.rejectionReason}</small>` : "";

    reservationsBody.innerHTML += `
      <tr>
        <td>
          <strong>${r.name || 'Unknown'}</strong><br>
          <small>${r.phone || 'No phone'}</small><br>
          <small>${r.email || 'No email'}</small>
        </td>
        <td>${r.date || '-'} <br> ${r.time || '-'}</td>
        <td>${r.guests || '-'}</td>
        <td>${r.note || '-'} ${rejectReasonText}</td>
        <td>${r.status || 'Pending'}</td>
        <td>${action}</td>
      </tr>`;
  });
});

document.addEventListener('click', async (e) => {
 
  if (e.target.classList.contains('btn-accept-res')) {
    const resId = e.target.getAttribute('data-id');
    const userId = e.target.getAttribute('data-user');
    const userName = e.target.getAttribute('data-name');

    if(!confirm(`Accept reservation for ${userName}?`)) return;
    
    try {
      await updateDoc(doc(db, "reservations", resId), { status: "Accepted" });
      
      if(userId !== "guest") {
        await addDoc(collection(db, "notifications"), {
          userId: userId, 
          message: `Your table reservation has been ACCEPTED. We look forward to seeing you! 🎉`, 
          isRead: false, 
          createdAt: new Date()
        });
      }
      showMsg("Reservation Accepted!");
    } catch (error) { alert("Error: " + error.message); }
  }
  
  if (e.target.classList.contains('btn-reject-res')) {
    const resId = e.target.getAttribute('data-id');
    const userId = e.target.getAttribute('data-user');
    const userName = e.target.getAttribute('data-name');

    const reason = prompt(`Why are you rejecting ${userName}'s reservation? (Enter reason)`);
    
    if (reason === null) return; 
    if (reason.trim() === "") {
      alert("Please enter a reason for rejection.");
      return;
    }

    try {
      await updateDoc(doc(db, "reservations", resId), { 
        status: "Rejected",
        rejectionReason: reason 
      });
      
      if(userId !== "guest") {
        await addDoc(collection(db, "notifications"), {
          userId: userId, 
          message: `Sorry, your table reservation has been REJECTED. Reason: ${reason}`, 
          isRead: false, 
          createdAt: new Date()
        });
      }
      showMsg("Reservation Rejected!", true);
    } catch (error) { alert("Error: " + error.message); }
  }
});
    