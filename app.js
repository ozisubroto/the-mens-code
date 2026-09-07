'use strict';
// Set the official store URL / WhatsApp number and price here when provided.
const SHOP = { price: 98000, currency: 'IDR', whatsapp: '', shippingFee: null, paymentLabel: 'Dikonfirmasi setelah pesanan diterima' };
fetch('/api/store').then(r=>r.json()).then(data=>Object.assign(SHOP,data)).catch(()=>{});
const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const modal = $('#modal');
const content = $('#modal-content');
let quantity = 1;
let cartQuantity = 0;
try { cartQuantity = Math.max(0, Math.min(99, Number(localStorage.getItem('tmc-cart')) || 0)); } catch {}
const productSvg = '<svg class="product-picture" viewBox="155 130 680 1135" role="img" aria-label="The Men\'s Code Performance Spray 25 ml"><image href="assets/product-hd.webp" width="1024" height="1536"/></svg>';
const priceText = () => SHOP.price === null ? '25 ml · Performance Spray for Men' : new Intl.NumberFormat('id-ID',{style:'currency',currency:SHOP.currency,maximumFractionDigits:0}).format(SHOP.price);
function toast(message) { const node=$('.toast'); node.textContent=message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.classList.remove('show'),3000); }
function updateCart() { const count=$('.cart-count'); count.textContent=cartQuantity; count.hidden=!cartQuantity; try {localStorage.setItem('tmc-cart',String(cartQuantity));} catch {} }
function show(html) { content.innerHTML=html; if(!modal.open)modal.showModal(); document.body.style.overflow='hidden'; modal.scrollTop=0; }
function close() { modal.close(); }
modal.addEventListener('close',()=>{document.body.style.overflow='';content.classList.remove('story-playing');});
$('.modal-close').addEventListener('click',close);
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
function productPanel(isCart=false) {
  quantity=isCart ? Math.max(1,cartQuantity) : 1;
  show(`<div class="product-modal">${productSvg}<div><p class="eyebrow">THE MEN'S CODE</p><h2 id="modal-title">${isCart?'Keranjang Anda':'Siap Menjadi The Player?'}</h2><span class="tag">Performance Spray for Men</span><p>${priceText()}</p><p>Kemasan spray yang praktis, dengan desain biru dan tutup putih. Pilih jumlah produk untuk pesanan Anda.</p><label for="quantity">Jumlah produk</label><div class="quantity"><button data-qty="-1" aria-label="Kurangi jumlah">−</button><output id="quantity">${quantity}</output><button data-qty="1" aria-label="Tambah jumlah">+</button></div><div class="modal-actions"><button class="button cyan" data-action="checkout">${isCart?'Lanjutkan Pesanan':'Beli Sekarang'} →</button><button class="button secondary" data-action="add">${isCart?'Simpan Jumlah':'Tambah ke Keranjang'}</button></div>${isCart&&cartQuantity?'<p><button class="text-link" data-action="remove">Kosongkan keranjang</button></p>':''}</div></div>`);
}
function checkout() {
  cartQuantity=quantity;updateCart();
  const amount=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(SHOP.price*quantity);
  show(`<p class="eyebrow">CHECKOUT</p><h2 id="modal-title">Lengkapi data penerima.</h2><div class="checkout-layout"><form id="checkout-form"><label>Nama lengkap<input name="name" autocomplete="name" required minlength="2" maxlength="100" placeholder="Nama penerima"></label><label>Nomor WhatsApp<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required pattern="[+0-9 ()-]{9,20}" maxlength="20" placeholder="08xxxxxxxxxx"></label><label>Alamat lengkap<textarea name="address" autocomplete="street-address" required minlength="10" maxlength="500" rows="3" placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan"></textarea></label><div class="field-row"><label>Kota / Kabupaten<input name="city" autocomplete="address-level2" required minlength="2" maxlength="100"></label><label>Kode pos<input name="postalCode" inputmode="numeric" autocomplete="postal-code" required pattern="[0-9]{5}" maxlength="5"></label></div><label>Catatan <span class="optional">(opsional)</span><textarea name="notes" rows="2" maxlength="300" placeholder="Petunjuk pengiriman"></textarea></label><label class="consent"><input type="checkbox" name="consent" required><span>Simpan data ini di perangkat saya untuk melanjutkan checkout nanti.</span></label><input type="text" name="website" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true"><p id="order-error" role="alert"></p><button class="button cyan" type="submit">Simpan Data →</button></form><aside class="order-summary"><b>The Men's Code</b><p>Performance Spray for Men · 25 ml</p><p>${quantity} × ${priceText()}</p><hr><p><strong>Subtotal ${amount}</strong></p><p>Ongkir: ${SHOP.shippingFee===null?'tersedia pada tahap berikutnya':new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(SHOP.shippingFee)}</p><p class="modal-note">Tahap saat ini hanya pengisian data penerima. Pilihan pengiriman dan pembayaran akan tersedia setelah integrasi selesai.</p></aside></div>`);
  try { const draft=JSON.parse(localStorage.getItem('tmc-checkout-draft')); if(draft){for(const field of ['name','phone','address','city','postalCode','notes']){const input=$('#checkout-form').elements.namedItem(field);if(input)input.value=String(draft[field]||'');}} } catch {}
}
const panels = {
  faq() { show(`<p class="eyebrow">FAQ</p><h2 id="modal-title">Pertanyaan yang sering ditanyakan</h2><details class="faq-item" open><summary>Apa produk The Men's Code?</summary><p>Produk yang ditampilkan adalah Performance Spray for Men dalam kemasan 25 ml.</p></details><details class="faq-item"><summary>Bagaimana cara membeli?</summary><p>Pilih Beli Sekarang, tentukan jumlah, lalu lanjutkan pesanan. Kanal pembelian resmi akan ditampilkan ketika tersedia.</p></details><details class="faq-item"><summary>Di mana informasi cara penggunaan?</summary><p>Ikuti petunjuk pada kemasan produk. Informasi penggunaan lengkap belum tersedia pada halaman ini.</p></details><details class="faq-item"><summary>Apakah keranjang saya tersimpan?</summary><p>Jumlah produk disimpan di browser perangkat ini. Anda dapat membukanya kembali melalui ikon keranjang.</p></details>`); },
  about() { show(`<p class="eyebrow">TENTANG THE MEN'S CODE</p><h2 id="modal-title">Lebih Dari Sekadar Produk.<br>Ini Tentang Kualitas Hidup.</h2><p>The Men's Code hadir untuk pria yang ingin selalu siap di setiap momen. Dengan formula pilihan dan teknologi modern, membantu menjaga performa, kontrol, dan rasa percaya diri secara alami.</p><p><strong>Same Man. Longer Stories.</strong><br>Karena kendali selalu ada di tanganmu.</p><button class="button cyan" data-action="product">Lihat Produk →</button>`); },
  story() { show(`<div class="story-visual"><svg viewBox="1263 0 2577 2160" role="img" aria-label="The Player"><image href="assets/hero-studio-4k.webp" width="3840" height="2160"/></svg></div><p class="eyebrow">THE PLAYER</p><h2 id="modal-title">Same Man. Longer Stories.</h2><p>Setiap momen berharga layak untuk berlangsung lebih lama. Karena kendali selalu ada di tanganmu.</p><p class="modal-note">Video kampanye belum tersedia. Jelajahi visual kampanye The Player.</p><button class="button" data-action="animate">Putar Visual Kampanye</button>`); },
  search() { show(`<p class="eyebrow">TEMUKAN PRODUK</p><h2 id="modal-title">Cari di The Men's Code</h2><label class="sr-only" for="search-input">Cari produk</label><input type="search" id="search-input" placeholder="Cari produk, spray, atau 25 ml…" autocomplete="off"><div id="search-results"><button class="search-result" data-action="product">${productSvg}<div><b>The Men's Code</b><span>Performance Spray for Men · 25 ml</span></div></button></div>`); setTimeout(()=>$('#search-input')?.focus(),50); },
  cart() { productPanel(true); },
  saved() { let draft;try{draft=JSON.parse(localStorage.getItem('tmc-checkout-draft'));}catch{}if(draft){quantity=Math.max(1,Math.min(99,Number(draft.quantity)||1));checkout();}else if(cartQuantity)productPanel(true);else show('<p class="eyebrow">PILIHAN ANDA</p><h2 id="modal-title">Belum ada data tersimpan.</h2><p>Mulai checkout untuk mengisi data penerima.</p><button class="button cyan" data-action="checkout">Isi Data Penerima →</button>'); },
  contact() { show('<p class="eyebrow">KONTAK</p><h2 id="modal-title">The Men\'s Code</h2><p>Kanal kontak resmi akan segera tersedia di halaman ini.</p><button class="button" data-action="product">Jelajahi Produk →</button>'); }
};
panels.reviews=()=>show(`<p class="eyebrow">APA KATA MEREKA?</p><h2 id="modal-title">Cerita mereka, dari seluruh Indonesia.</h2>${$$('.review').map(x=>x.outerHTML).join('')}`);
document.addEventListener('click',async e=>{
  const buy=e.target.closest('[data-buy]');if(buy){quantity=Math.max(1,cartQuantity);checkout();return;}
  const open=e.target.closest('[data-open]');if(open){panels[open.dataset.open]?.();return;}
  const scroll=e.target.closest('[data-scroll]');if(scroll){document.getElementById(scroll.dataset.scroll)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}
  const social=e.target.closest('[data-social]');if(social){show(`<h2 id="modal-title">${social.dataset.social}</h2><p>Akun resmi The Men's Code akan ditampilkan di sini ketika tersedia.</p>`);return;}
  const qty=e.target.closest('[data-qty]');if(qty){quantity=Math.max(1,Math.min(99,quantity+Number(qty.dataset.qty)));$('#quantity').textContent=quantity;return;}
  const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(action==='product')productPanel();
  if(action==='cart')productPanel(true);
  if(action==='checkout')checkout();
  if(action==='add'){cartQuantity=quantity;updateCart();toast(`${quantity} produk tersimpan di keranjang`);close();}
  if(action==='remove'){cartQuantity=0;updateCart();close();toast('Keranjang dikosongkan');}
  if(action==='animate'){content.classList.toggle('story-playing');e.target.textContent=content.classList.contains('story-playing')?'Jeda Visual':'Putar Visual Kampanye';}
  if(action==='copy'){try{await navigator.clipboard.writeText(`The Men's Code Performance Spray for Men 25 ml — ${cartQuantity} pcs`);toast('Daftar produk disalin');}catch{toast('Pilih teks ringkasan untuk menyalinnya.');}}
});
content.addEventListener('input',e=>{if(e.target.id==='search-input'){const query=e.target.value.trim().toLowerCase();const match=!query||query.split(/\s+/).every(word=>"the men's code performance spray for men 25 ml produk".includes(word));$('#search-results').innerHTML=match?`<button class="search-result" data-action="product">${productSvg}<div><b>The Men's Code</b><span>Performance Spray for Men · 25 ml</span></div></button>`:'<p>Produk tidak ditemukan. Coba kata “spray” atau “The Men\'s Code”.</p>';}});
const menu=$('.menu-button');menu.addEventListener('click',()=>{const expanded=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!expanded));menu.setAttribute('aria-label',expanded?'Buka menu':'Tutup menu');$('#navigation').classList.toggle('open',!expanded);});
$('#navigation').addEventListener('click',e=>{if(e.target.closest('a,button')){menu.setAttribute('aria-expanded','false');$('#navigation').classList.remove('open');}});
let reviewIndex=0;const track=$('#review-track');
function rotateReview(direction){if(matchMedia('(max-width:760px)').matches){reviewIndex=(reviewIndex+direction+3)%3;track.scrollTo({left:$$('.review',track)[reviewIndex].offsetLeft-track.firstElementChild.offsetLeft,behavior:'smooth'});}else{if(direction>0)track.append(track.firstElementChild);else track.prepend(track.lastElementChild);track.animate([{opacity:.3,transform:`translateX(${direction*12}px)`},{opacity:1,transform:'translateX(0)'}],{duration:320,easing:'ease-out'});}}
$('#review-prev').addEventListener('click',()=>rotateReview(-1));$('#review-next').addEventListener('click',()=>rotateReview(1));
if('IntersectionObserver' in window){document.body.classList.add('motion-ready');const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.08});$$('.reveal').forEach(x=>observer.observe(x));const navObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){$$('.navigation a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));}}),{rootMargin:'-15% 0px -60% 0px'});$$('main section[id]').forEach(x=>navObserver.observe(x));}
updateCart();
content.addEventListener('submit',e=>{
  if(e.target.id!=='checkout-form')return;
  e.preventDefault();
  const form=e.target;
  const fields=Object.fromEntries(new FormData(form));
  delete fields.website;
  try {
    localStorage.setItem('tmc-checkout-draft',JSON.stringify({...fields,quantity}));
    show('<p class="eyebrow">DATA PENERIMA</p><h2 id="modal-title">Data Anda sudah tersimpan.</h2><p>Data tersimpan di perangkat ini. Pengiriman dan pembayaran akan tersedia pada tahap berikutnya.</p><p class="modal-note">Belum ada pesanan yang dikirim atau pembayaran yang diproses.</p><button class="button cyan" data-action="checkout">Ubah Data →</button>');
  } catch {
    $('#order-error').textContent='Browser tidak dapat menyimpan data. Aktifkan penyimpanan browser atau coba perangkat lain.';
  }
});
