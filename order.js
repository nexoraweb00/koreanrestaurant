const urlParams = new URLSearchParams(window.location.search);
const dishId = urlParams.get('id');
const dishImg = document.getElementById('dishImg');
const dishTitle = document.getElementById('dishTitle');
const dishPrice = document.getElementById('dishPrice');
const dishDesc = document.getElementById('dishDesc');
const qtyInput = document.getElementById('qtyInput');
const dot = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  if(dot) { dot.style.left = mx + 'px'; dot.style.top = my + 'px'; }
});

function animateRing() {
  rx += (mx - rx) * 0.18;
  ry += (my - ry) * 0.18;
  if(ring) { ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }
  requestAnimationFrame(animateRing);
}
animateRing();

document.querySelectorAll('a, button, input, select, textarea, .order-img-box').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});

let appliedDiscount = 0;
let finalPrice = 0;

async function loadDishData() {
  if (!window.firebaseDB) { setTimeout(loadDishData, 500); return; }
  if (!dishId) { alert("No dish selected!"); window.location.href = "index.html#menu"; return; }

  const discountParam = urlParams.get('discount');
  appliedDiscount = discountParam ? parseFloat(discountParam) : 0;

  const { db, doc, getDoc } = window.firebaseDB;
  try {
    const docSnap = await getDoc(doc(db, "menu", dishId));
    if (docSnap.exists()) {
      const dish = docSnap.data();
      
      const originalPrice = dish.price;
      finalPrice = originalPrice; 
      
      dishImg.src = dish.image;
      dishTitle.innerHTML = `${dish.name_kr} <span class='en'>${dish.name_en}</span>`;
      dishDesc.innerText = dish.desc;

      if (appliedDiscount > 0) {
        finalPrice = Math.round(originalPrice - (originalPrice * (appliedDiscount / 100)));
        dishPrice.innerHTML = `
          <span style="text-decoration: line-through; color: #888; font-size: 0.7em; margin-right: 10px;">Rs. ${originalPrice}</span> 
          <span style="color: #ff4d4d; font-weight: bold;">Rs. ${finalPrice}</span>
        `;
      } else {
        dishPrice.innerText = `Rs. ${originalPrice}`;
      }
    }
  } catch (error) { console.error(error); }
}
loadDishData();

document.getElementById('btnInc').addEventListener('click', () => { qtyInput.value = parseInt(qtyInput.value) + 1; });
document.getElementById('btnDec').addEventListener('click', () => { if (parseInt(qtyInput.value) > 1) qtyInput.value = parseInt(qtyInput.value) - 1; });
document.querySelectorAll('.stars span').forEach(star => {
  star.addEventListener('click', function() {
    const val = this.getAttribute('data-val');
    document.querySelectorAll('.stars span').forEach(s => {
      if(s.getAttribute('data-val') <= val) s.classList.add('active'); else s.classList.remove('active');
    });
  });
});
document.querySelectorAll('input[name="payment"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    document.getElementById('cardDetails').style.display = e.target.value === 'Card Payment' ? 'block' : 'none';
  });
});

window.showCustomModal = (title, msg, showLoginBtn = false) => {
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalMessage').innerText = msg;
  document.getElementById('modalLoginBtn').style.display = showLoginBtn ? 'inline-block' : 'none';
  document.getElementById('customModal').classList.add('active');
};
window.closeCustomModal = () => { document.getElementById('customModal').classList.remove('active'); };

document.getElementById('submitOrder').addEventListener('click', async function() {
  if (!window.currentUser) {
    showCustomModal("Login Required", "Please login before placing an order!", true);
    return;
  }

  const btn = this;
  btn.innerText = "Checking Profile...";
  btn.disabled = true;

  const { db, doc, getDoc, updateDoc } = window.firebaseDB;

  try {
    const userRef = doc(db, "users", window.currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    let userData = userSnap.exists() ? userSnap.data() : {};
    
    if (!userData.phone || !userData.address) {
      document.getElementById('profileModal').classList.add('active');
      btn.innerText = "Place Order";
      btn.disabled = false;
      return; 
    }

    await placeOrder(userData.phone, userData.address);

  } catch (error) {
    showCustomModal("Error", error.message);
    btn.innerText = "Place Order";
    btn.disabled = false;
  }
});

document.getElementById('saveProfileBtn').addEventListener('click', async function() {
  const phone = document.getElementById('profilePhone').value;
  const address = document.getElementById('profileAddress').value;

  if(!phone || !address) { alert("Please fill in all fields."); return; }
  this.innerText = "Saving...";
  
  try {
    const { db, doc, updateDoc } = window.firebaseDB;
    const userRef = doc(db, "users", window.currentUser.uid);
    
    await updateDoc(userRef, { phone: phone, address: address });
    document.getElementById('profileModal').classList.remove('active');
    
    await placeOrder(phone, address);

  } catch (error) {
    alert("Error saving profile: " + error.message);
    this.innerText = "Save & Continue Order";
  }
});

async function placeOrder(phone, address) {
  const btn = document.getElementById('submitOrder');
  btn.innerText = "Placing Order...";

  const qty = qtyInput.value;
  const selectedStar = document.querySelector('.stars span.active');
  const rating = selectedStar ? selectedStar.getAttribute('data-val') : 0;
  const itemName = dishTitle.innerText.replace(/<[^>]*>?/gm, '').trim(); 
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

  try {
    const { db, collection, addDoc, serverTimestamp } = window.firebaseDB;
    await addDoc(collection(db, "orders"), {
      userId: window.currentUser.uid,
      userEmail: window.currentUser.email,
      phone: phone,
      address: address,
      dishName: itemName,
      quantity: qty,
      price: `Rs. ${finalPrice}`,
      rating: rating,
      paymentMethod: paymentMethod,
      orderDate: serverTimestamp(),
      status: "Pending"
    });

    showCustomModal("Order Placed! ✨", `Your order for ${qty} x ${itemName} has been placed at Rs. ${finalPrice * qty}.`);
    
    btn.innerText = "Place Order";
    btn.disabled = false;

    setTimeout(() => {
      document.querySelector('.modal-btn.secondary').onclick = () => { window.location.href = "index.html"; };
    }, 100);

  } catch (error) {
    showCustomModal("Error", "Something went wrong. Please try again.");
    btn.innerText = "Place Order";
    btn.disabled = false;
  }
}