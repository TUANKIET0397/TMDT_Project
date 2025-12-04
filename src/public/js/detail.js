document.addEventListener('DOMContentLoaded', () => {
  // ===== DATA =====
  const productData = window.productData || {
    id: null,
    name: '',
    description: '',
    type: '',
    cost: '',
    mainImages: [],
    colors: [],
  };

  let tempColorData = { colorName: '', images: [], sizes: [] };

  // ===== ELEMENTS =====
  const mainImageItems = document.querySelectorAll('.add-left .add-card__item');
  const modalImageItems = document.querySelectorAll('.modal-image-item');
  const colorCardsContainer = document.getElementById('colorCardsContainer');
  const modal = document.getElementById('colorModal');
  const modalColorInput = modal.querySelector('.modal_color');
  const modalQtyInput = modal.querySelector('.modal-quantity-input');
const getModalSizeBtns = () => modal.querySelectorAll('.modal-size-btn');  const modalSaveBtn = modal.querySelector(
    '.modal-quantity-wrap .modal-save-btn'
  );
  const closeModalBtn = document.getElementById('closeModalBtn');
  const editUpdateBtn = document.getElementById('editUpdateBtn');
  let modalRemoveBtn = null;

  const sizeOptions = document.querySelectorAll('.section__form-size');
  const addQuantity = document.querySelector('.add_quantity');
  const qtyInput = document.querySelector('.add__quantity-input');
  const saveQtyBtn = addQuantity.querySelector('.add-save-btn');

  const costInput = document.getElementById('add__input-cost');
  const typeSelect = document.getElementById('typeSelect');
  const productNameInput = document.getElementById('productName');
  const descriptionInput = document.getElementById('description');

  addQuantity.style.display = 'none';
  qtyInput.disabled = true;
  let selectedSizeInMain = null;
  let selectedSizeInModal = null;
  let editingColorIndex = null;
  let isEditMode = false;

  // THÊM: set size mode by type (show numeric sizes for shoes)
function setSizeModeForType(typeValue) {
  const isShoes = String(typeValue) === '7';
  const sizesLetterWrap = document.querySelector('.sizes-letter');
  const sizesNumericWrap = document.querySelector('.sizes-numeric');
  const modalSizesLetter = document.querySelector('.modal-sizes-letter');
  const modalSizesNumeric = document.querySelector('.modal-sizes-numeric');
  if (sizesLetterWrap && sizesNumericWrap && modalSizesLetter && modalSizesNumeric) {
    sizesLetterWrap.style.display = isShoes ? 'none' : 'flex';
    sizesNumericWrap.style.display = isShoes ? 'flex' : 'none';
    modalSizesLetter.style.display = isShoes ? 'none' : 'flex';
    modalSizesNumeric.style.display = isShoes ? 'flex' : 'none';
  }
}
// THÊM: clear active selections (main + modal)
function clearActiveSizes() {
  document.querySelectorAll('.section__form-size.active-form').forEach(el => el.classList.remove('active-form'));
  getModalSizeBtns().forEach(el => el.classList.remove('active'));
  selectedSizeInModal = null;
  selectedSizeInMain = null;
  updateQuantityVisibility();
}



  // ===== DISABLE/ENABLE FUNCTIONS =====
  function disableAllInputs() {
    productNameInput.disabled = true;
    descriptionInput.disabled = true;
    costInput.disabled = true;
    typeSelect.disabled = true;

    // Disable main image uploads
    mainImageItems.forEach((item) => {
      const input = item.querySelector('.image-input');
      input.disabled = true;
      item.style.pointerEvents = 'none';
      item.style.opacity = '0.6';
      item.style.cursor = 'not-allowed';
    });

    // Disable size selection
    sizeOptions.forEach((opt) => {
      opt.style.pointerEvents = 'none';
      opt.style.opacity = '0.6';
      opt.style.cursor = 'not-allowed';
    });

    // Disable color cards
    const colorCards = colorCardsContainer.querySelectorAll(
      '.add__product-color'
    );
    colorCards.forEach((card) => {
      card.style.pointerEvents = 'none';
      card.style.opacity = '0.6';
      card.style.cursor = 'not-allowed';
    });

    // Disable save buttons
    saveQtyBtn.disabled = true;
    saveQtyBtn.style.opacity = '0.5';
    saveQtyBtn.style.cursor = 'not-allowed';
  }

  function enableAllInputs() {
    productNameInput.disabled = false;
    descriptionInput.disabled = false;
    costInput.disabled = false;
    typeSelect.disabled = false;

    // Enable main image uploads
    mainImageItems.forEach((item) => {
      const input = item.querySelector('.image-input');
      input.disabled = false;
      item.style.pointerEvents = 'auto';
      item.style.opacity = '1';
      item.style.cursor = 'pointer';
    });

    // Enable size selection
    sizeOptions.forEach((opt) => {
      opt.style.pointerEvents = 'auto';
      opt.style.opacity = '1';
      opt.style.cursor = 'pointer';
    });

    // Enable color cards
    const colorCards = colorCardsContainer.querySelectorAll(
      '.add__product-color'
    );
    colorCards.forEach((card) => {
      card.style.pointerEvents = 'auto';
      card.style.opacity = '1';
      card.style.cursor = 'pointer';
    });

    // Enable save buttons
    saveQtyBtn.disabled = false;
    saveQtyBtn.style.opacity = '1';
    saveQtyBtn.style.cursor = 'pointer';
  }

  // ===== INITIALIZE MAIN IMAGES =====
  function initializeMainImages() {
    mainImageItems.forEach((item, index) => {
      const preview = item.querySelector('.main-preview-image');
      const plusIcon = item.querySelector('.add-card__plus');

      if (productData.mainImages && productData.mainImages[index]) {
        preview.src = productData.mainImages[index];
        preview.style.display = 'block';
        plusIcon.style.display = 'none';
      } else {
        preview.style.display = 'none';
        plusIcon.style.display = 'flex';
      }
    });
  }

  // ===== FUNCTIONS =====
  function updateQuantityVisibility() {
    const selected = document.querySelector('.section__form-size.active-form');
    if (selected) {
      addQuantity.style.display = 'flex';
      qtyInput.disabled = false;
      qtyInput.focus();
      qtyInput.value = '';
      selectedSizeInMain = selected.textContent.trim();
    } else {
      addQuantity.style.display = 'none';
      qtyInput.disabled = true;
      qtyInput.value = '';
      selectedSizeInMain = null;
    }
  }

  function resetModalImages() {
    modalImageItems.forEach((item) => {
      const input = item.querySelector('.modal-image-input');
      const preview = item.querySelector('.modal-preview-image');
      const plusIcon = item.querySelector('.modal-image-plus');
      input.value = '';
      preview.style.display = 'none';
      preview.src = '';
      plusIcon.style.display = 'flex';
    });
  }

  function reindexColorCards() {
  const cards = Array.from(
    colorCardsContainer.querySelectorAll('.add__product-color:not(.add-new)')
  );
  let idx = 0;
  cards.forEach((c) => {
    c.dataset.colorIndex = idx;
    idx++;
  });
}

 // ✅ FIX 5: Chỉ reindex khi thực sự xóa
async function removeColorAt(index) {
  index = Number(index);
  if (!Number.isFinite(index)) return;

  const color = productData.colors[index];

  if (color && color.colorId) {
    try {
      const res = await fetch(`/admin/color/${color.colorId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('Failed to delete color:', data);
        alert('Failed to delete color: ' + (data.message || 'Unknown error'));
        return;
      }
      console.log(' Color deleted from database');
    } catch (err) {
      console.error('Error deleting color:', err);
      alert('Error deleting color. Please try again.');
      return;
    }
  }

  const card = colorCardsContainer.querySelector(
    `.add__product-color[data-color-index="${index}"]`
  );
  if (card && card.dataset.thumbUrl) {
    try {
      URL.revokeObjectURL(card.dataset.thumbUrl);
    } catch (e) {}
  }

  // ✅ MARK AS DELETED, không xóa khỏi array ngay
  productData.colors[index]._deleted = true;
  if (card) card.remove();
  
  // ✅ Reindex tất cả remaining cards
  reindexColorCards();

  }

 function openNewColorModal(e) {
  e?.stopPropagation();
  editingColorIndex = null;
  tempColorData = { colorName: '', images: [], sizes: [] };
  modalColorInput.value = '';
  modalQtyInput.value = '';
  selectedSizeInModal = null;
  getModalSizeBtns().forEach((b) => b.classList.remove('active'));
  resetModalImages();
  if (modalRemoveBtn) modalRemoveBtn.style.display = 'none';
  // ensure correct size-mode shown in modal for current type
setSizeModeForType(typeSelect.value);
 modal.classList.add('active');
}
if (typeSelect) {
  setSizeModeForType(typeSelect.value);
  typeSelect.addEventListener('change', function () {
    setSizeModeForType(this.value);
    clearActiveSizes();
  });
}
  function openColorModalForIndex(index) {
  index = Number(index);
  if (!Number.isFinite(index) || !productData.colors[index]) return openNewColorModal();
  editingColorIndex = index;
  const source = productData.colors[index];
  tempColorData = {
    colorId: source.colorId,
    colorName: source.colorName,
    images: [...source.images],
    sizes: source.sizes.map((s) => ({ size: s.size, quantity: s.quantity })),
  };
  modalColorInput.value = tempColorData.colorName || '';
  modalQtyInput.value = '';
  selectedSizeInModal = null;
  getModalSizeBtns().forEach((b) => b.classList.remove('active'));
  resetModalImages();
  setSizeModeForType(typeSelect.value);

    modalImageItems.forEach((item, idx) => {
      const preview = item.querySelector('.modal-preview-image');
      const plusIcon = item.querySelector('.modal-image-plus');
      const file = tempColorData.images[idx];

      if (file) {
        if (file instanceof File) {
          const reader = new FileReader();
          reader.onload = (ev) => (preview.src = ev.target.result);
          reader.readAsDataURL(file);
        } else {
          preview.src = file;
        }
        preview.style.display = 'block';
        plusIcon.style.display = 'none';
      } else {
        preview.style.display = 'none';
        preview.src = '';
        plusIcon.style.display = 'flex';
      }
    });

    const sizeMap = {};
    tempColorData.sizes.forEach((s) => (sizeMap[s.size] = s.quantity));
    getModalSizeBtns().forEach((btn) => {
      const sz = btn.dataset.size;
      if (sizeMap[sz]) {
        btn.title = 'Qty: ' + sizeMap[sz];
        btn.style.opacity = '0.7';
      } else {
        btn.title = '';
        btn.style.opacity = '';
      }
    });

    modal.classList.add('active');

    const modalContent = modal.querySelector('.modal-content') || modal;
    if (!modalRemoveBtn) {
      modalRemoveBtn = document.createElement('button');
      modalRemoveBtn.type = 'button';
      modalRemoveBtn.className = 'modal-remove-btn';
      modalRemoveBtn.textContent = 'Delete Color';
      modalContent.appendChild(modalRemoveBtn);
      modalRemoveBtn.addEventListener('click', () => {
      if (editingColorIndex !== null) {
        // ✅ Mark màu này là deleted (không xóa khỏi array)
        productData.colors[editingColorIndex]._deleted = true;
        
        // Remove card from UI
        const card = colorCardsContainer.querySelector(
          `.add__product-color[data-color-index="${editingColorIndex}"]`
        );
        if (card) card.remove();

        console.log(`Marked color ${editingColorIndex} as deleted`);
      }

      modal.classList.remove('active');
      editingColorIndex = null;
      tempColorData = { colorName: '', images: [], sizes: [] };
    });
    reindexColorCards(); // ✅ Reindex tất cả remaining colors
  }
    modalRemoveBtn.style.display = '';
  }

  function addColorCard(colorIndex) {
  const color = productData.colors[colorIndex];
  const colorCard = document.createElement('div');
  colorCard.className = 'add__product-color';
  colorCard.dataset.colorIndex = colorIndex;
  const plusBlock = document.createElement('div');
  plusBlock.className = 'add-card__plus add__product-plus active__product-color';
  plusBlock.innerHTML = `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 6.25V23.75" stroke="#000" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M6.25 15H23.75" stroke="#000" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
  colorCard.appendChild(plusBlock);
  const first = color.images[0];
  if (first) {
    let src = '';
    if (first instanceof File) src = URL.createObjectURL(first);
    else src = first;
    colorCard.dataset.thumbUrl = src;
    const svg = plusBlock.querySelector('svg');
    if (svg) svg.style.display = 'none';
    const img = document.createElement('img');
    img.className = 'color-thumb-img';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.src = src;
    plusBlock.appendChild(img);
  }
  // add label
  const label = document.createElement('div');
  label.className = 'color-card-label';
  label.textContent = color.colorName || '';
  colorCard.appendChild(label);
  const addNew = colorCardsContainer.querySelector('.add__product-color.add-new');
  if (addNew) colorCardsContainer.insertBefore(colorCard, addNew);
  else colorCardsContainer.appendChild(colorCard);
  reindexColorCards();
}

function renderColorCards() {
  // re-create existing cards (keep add-new)
  if (!colorCardsContainer) return;
  const addNewTemplate = colorCardsContainer.querySelector('.add__product-color.add-new');
  colorCardsContainer.innerHTML = '';
  if (addNewTemplate) colorCardsContainer.appendChild(addNewTemplate.cloneNode(true));
  else {
    const plus = document.createElement('div');
    plus.className = 'add__product-color add-new';
    plus.innerHTML = `<div class="add-card__plus add__product-plus"><svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="M15 6.25V23.75" stroke="#000"/><path d="M6.25 15H23.75" stroke="#000"/></svg></div>`;
    colorCardsContainer.appendChild(plus);
  }
  (productData.colors || []).forEach((_, i) => addColorCard(i));
}

  // ===== UPDATE PRODUCT FUNCTION =====
  async function updateProduct() {
  productData.name = productNameInput.value.trim();
  productData.description = descriptionInput.value.trim();
  productData.type = typeSelect.value;
  productData.cost = costInput.value.trim();

  if (
    !productData.name ||
    !productData.description ||
    !productData.type ||
    !productData.cost
  ) {
    alert('Please fill all required fields');
    return;
  }

  // ✅ FIX 1: Filter bỏ colors đã xóa
  const activeColors = productData.colors.filter(c => !c._deleted);
  
  if (activeColors.length === 0) {
    alert('Please add at least one color with sizes');
    return;
  }

  const isShoes = String(productData.type) === '7';
  activeColors.forEach((color) => {
    color.sizes = (color.sizes || []).map((s) => ({
      size: isShoes ? String(Number(s.size)) : String(s.size || '').trim().toUpperCase(),
      quantity: Number(s.quantity) || 0,
    }));
  });

  const formData = new FormData();
  formData.append('ProductName', productData.name);
  formData.append('Descriptions', productData.description);
  formData.append('TypeID', productData.type);
  formData.append('Price', productData.cost);

  // Main images
  productData.mainImages.forEach((file, idx) => {
    if (file instanceof File) {
      formData.append('mainImages', file);
      formData.append('mainImageChangedIndexes', idx);
    } else if (typeof file === 'string' && file.length > 0) {
      formData.append('existingMainImages', file);
    }
  });

  // ✅ FIX 2: Collect deleted color IDs
  const deletedColorIds = productData.colors
    .filter(c => c._deleted && c.colorId)
    .map(c => c.colorId);

  // ✅ FIX 3: Send only ACTIVE colors with correct indexes
  activeColors.forEach((color, ci) => {  // ✅ ci từ activeColors, không phải productData.colors
    if (color.colorId) {
      formData.append(`colors[${ci}][colorId]`, color.colorId);
    }
    formData.append(`colors[${ci}][colorName]`, color.colorName);

    const changedSlots = [];
    (color.images || []).forEach((file, idx) => {
      if (file instanceof File) {
        formData.append(`colors[${ci}][images]`, file);
        changedSlots.push(idx);
      } else if (typeof file === 'string' && file.length > 0) {
        formData.append(`colors[${ci}][existingImages]`, file);
      }
    });

    changedSlots.forEach((slot) => {
      formData.append(`colors[${ci}][changedImageIndexes]`, slot);
    });

    (color.sizes || []).forEach((s, si) => {
      formData.append(`colors[${ci}][sizes][${si}][size]`, s.size);
      formData.append(`colors[${ci}][sizes][${si}][quantity]`, s.quantity);
    });
  });

  // Send deleted color IDs
  deletedColorIds.forEach((id) => {
    formData.append('deletedColorIds', id);
  });

  console.log('✅ Active colors:', activeColors.length);
  console.log('✅ Deleted color IDs:', deletedColorIds);

  try {
    const res = await fetch(`/admin/detail/${productData.id}`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Product updated successfully!');
      window.location.reload();
    } else {
      console.error('Update failed', data);
      alert('Update failed: ' + (data.message || 'Unknown'));
    }
  } catch (err) {
    console.error('Request error', err);
    alert('Request error. See console.');
  }
}

  // ===== EVENT LISTENERS =====

  // Edit/Update button
  editUpdateBtn.addEventListener('click', async () => {
    if (!isEditMode) {
      // Switch to Edit mode
      isEditMode = true;
      enableAllInputs();

      const icon = editUpdateBtn.querySelector('i');
      const text = editUpdateBtn.querySelector('.header__save');
      icon.className = 'fa-solid fa-floppy-disk';
      text.textContent = 'Update';
      editUpdateBtn.style.background = '#4CAF50';
    } else {
      // Update product
      await updateProduct();
    }
  });

  // Main images upload
  mainImageItems.forEach((item, index) => {
    const input = item.querySelector('.image-input');
    const preview = item.querySelector('.main-preview-image');
    const plusIcon = item.querySelector('.add-card__plus');

    item.addEventListener('click', () => {
      if (!input.disabled) input.click();
    });
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.style.display = 'block';
        plusIcon.style.display = 'none';
        productData.mainImages[index] = file;
      };
      reader.readAsDataURL(file);
    });
  });

  // Modal images upload
  modalImageItems.forEach((item, index) => {
    const input = item.querySelector('.modal-image-input');
    const preview = item.querySelector('.modal-preview-image');
    const plusIcon = item.querySelector('.modal-image-plus');

    item.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.style.display = 'block';
        plusIcon.style.display = 'none';
        tempColorData.images[index] = file;
      };
      reader.readAsDataURL(file);
    });
  });

  // Size selection
  sizeOptions.forEach((option) =>
    option.addEventListener('click', function () {
      if (this.style.pointerEvents === 'none') return;
      const isActive = this.classList.contains('active-form');
      sizeOptions.forEach((opt) => opt.classList.remove('active-form'));
      if (!isActive) this.classList.add('active-form');
      updateQuantityVisibility();
    })
  );

  saveQtyBtn.addEventListener('click', () => {
    if (!selectedSizeInMain || !qtyInput.value.trim()) {
      alert('Please select size and enter quantity');
      return;
    }
    if (productData.colors.length === 0)
      productData.colors.push({ colorName: 'Default', images: [], sizes: [] });
    const color = productData.colors[0];
    const existing = color.sizes.find((s) => s.size === selectedSizeInMain);
    if (existing) existing.quantity = Number(qtyInput.value);
    else
      color.sizes.push({
        size: selectedSizeInMain,
        quantity: Number(qtyInput.value),
      });
    sizeOptions.forEach((opt) => opt.classList.remove('active-form'));
    qtyInput.value = '';
    updateQuantityVisibility();
  });

  // Modal size buttons
    modal.addEventListener('click', function (e) {
  const btn = e.target.closest('.modal-size-btn');
  if (!btn) return;
  if (getComputedStyle(btn).display === 'none') return;
  // clear and set active on clicked
  getModalSizeBtns().forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  selectedSizeInModal = btn.dataset.size;
  const exist = (tempColorData.sizes || []).find((s) => s.size === selectedSizeInModal);
  modalQtyInput.value = exist ? exist.quantity : '';
  modalQtyInput.focus();
});
  

  // Modal save quantity
  modalSaveBtn.addEventListener('click', () => {
    if (!selectedSizeInModal || !modalQtyInput.value.trim()) {
      alert('Please select size and enter quantity');
      return;
    }
    if (!modalColorInput.value.trim()) {
      alert('Please enter color name');
      return;
    }
    tempColorData.colorName = modalColorInput.value.trim();
    const existing = tempColorData.sizes.find(
      (s) => s.size === selectedSizeInModal
    );
    if (existing) existing.quantity = Number(modalQtyInput.value);
    else
      tempColorData.sizes.push({
        size: selectedSizeInModal,
        quantity: Number(modalQtyInput.value),
      });
    getModalSizeBtns().forEach((b) => b.classList.remove('active'));
    modalQtyInput.value = '';
    selectedSizeInModal = null;
  });

  // Close modal
  closeModalBtn.addEventListener('click', () => {
    if (
      !tempColorData ||
      (Array.isArray(tempColorData.sizes) && tempColorData.sizes.length === 0)
    ) {
      alert('Please add at least one size!');
      return;
    }

    // ===== TRACK CHANGED IMAGE SLOTS =====
    const changedSlots = [];
    (tempColorData.images || []).forEach((img, idx) => {
      if (img instanceof File) {
        changedSlots.push(idx); // Slot này có ảnh mới (File)
      }
    });
    tempColorData.changedImageIndexes = changedSlots; // LƯU vào tempColorData

    if (editingColorIndex !== null) {
      productData.colors[editingColorIndex] = tempColorData;
      const card = colorCardsContainer.querySelector(
        `.add__product-color[data-color-index="${editingColorIndex}"]`
      );
      if (card) {
        const plusBlock = card.querySelector('.add-card__plus');
        const first = tempColorData.images[0] || null;
        let src = '';
        if (first) {
          if (first instanceof File) src = URL.createObjectURL(first);
          else src = first;
        }
        if (src) {
          let img = plusBlock.querySelector('.color-thumb-img');
          if (!img) {
            img = document.createElement('img');
            img.className = 'color-thumb-img';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            plusBlock.appendChild(img);
          }
          img.src = src;
          const svg = plusBlock.querySelector('svg');
          if (svg) svg.style.display = 'none';
        }
      }
    } else {
      productData.colors.push(tempColorData);
      addColorCard(productData.colors.length - 1);
    }

    editingColorIndex = null;
    tempColorData = { colorName: '', images: [], sizes: [] };
    resetModalImages();
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Initialize color cards
  (function initColorCards() {
    if (!colorCardsContainer) return;
  // Create or keep an "Add New" card
  const addNew = colorCardsContainer.querySelector('.add__product-color.add-new');
  if (!addNew) {
    // ensure there is an add button for new color
    const plus = document.createElement('div');
    plus.className = 'add__product-color add-new';
    plus.innerHTML = `<div class="add-card__plus add__product-plus"><svg ...></svg></div>`;
    colorCardsContainer.appendChild(plus);
  }

  // Use delegation for clicks inside container
  colorCardsContainer.removeEventListener('click', colorCardsContainer._delegatedHandler);
  const delegatedHandler = (ev) => {
    const card = ev.target.closest('.add__product-color');
    if (!card || !colorCardsContainer.contains(card)) return;
    if (card.classList.contains('add-new')) {
      openNewColorModal(ev);
      return;
    }
    // find index safely
    let index = typeof card.dataset.colorIndex !== 'undefined' 
    ? Number(card.dataset.colorIndex) 
    : -1;
    if (index < 0) {
      // fallback: compute index by node list
      const cards = Array.from(colorCardsContainer.querySelectorAll('.add__product-color:not(.add-new)'));
      index = cards.indexOf(card);
    }
    if (index >= 0) openColorModalForIndex(index);
  };
  colorCardsContainer.addEventListener('click', delegatedHandler);
  colorCardsContainer._delegatedHandler = delegatedHandler; // store so we can remove if re-render
})();
  // ===== INITIALIZE =====
  initializeMainImages();
  disableAllInputs();

  console.log(' Detail page initialized - Edit mode disabled');
});
