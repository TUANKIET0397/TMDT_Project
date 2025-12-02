const productData = {
    name: "",
    description: "",
    type: "",
    cost: "",
    mainImages: [],
    colors: [],
}

let tempColorData = { colorName: "", images: [], sizes: [] }
let selectedSizeInModal = null
let editingColorIndex = null

const mainImageItems = document.querySelectorAll(".add-left .add-card__item")
const modalImageItems = document.querySelectorAll(".modal-image-item")

mainImageItems.forEach((item) => {
    const input = item.querySelector(".image-input")
    const preview = item.querySelector(".preview-image")
    const plusIcon = item.querySelector(".add-card__plus")

    item.addEventListener("click", () => input.click())
    input.addEventListener("change", (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            preview.src = ev.target.result
            preview.style.display = "block"
            plusIcon.style.display = "none"
            productData.mainImages[Number(item.dataset.index)] = file
        }
        reader.readAsDataURL(file)
    })
})

modalImageItems.forEach((item) => {
    const input = item.querySelector(".modal-image-input")
    const preview = item.querySelector(".modal-preview-image")
    const plusIcon = item.querySelector(".modal-image-plus")

    item.addEventListener("click", () => input.click())
    input.addEventListener("change", (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            preview.src = ev.target.result
            preview.style.display = "block"
            plusIcon.style.display = "none"
            tempColorData.images[Number(item.dataset.modalIndex)] = file
        }
        reader.readAsDataURL(file)
    })
})

const addQuantity = document.querySelector(".add_quantity")
const qtyInput = document.querySelector(".add__quantity-input")
const saveQtyBtn = addQuantity.querySelector(".add-save-btn")
const costInput = document.getElementById("add__input-cost")
const typeSelect = document.getElementById("typeSelect")
const productNameInput = document.getElementById("productName")
const descriptionInput = document.getElementById("description")

// size containers & modal size containers
const sizesContainer = document.querySelector(".section__form")
const sizesLetterWrap = document.querySelector(".sizes-letter")
const sizesNumericWrap = document.querySelector(".sizes-numeric")
const modalSizesLetter = document.querySelector(".modal-sizes-letter")
const modalSizesNumeric = document.querySelector(".modal-sizes-numeric")

// modal related nodes
const modal = document.getElementById("colorModal")
const colorCardsContainer = document.getElementById("colorCardsContainer")
const closeModalBtn = document.getElementById("closeModalBtn")
const getModalSizeBtns = () => document.querySelectorAll(".modal-size-btn")
const modalColorInput = document.querySelector(".modal_color")
const modalQtyInput = document.querySelector(".modal-quantity-input")
const modalSaveBtn = document.querySelector(
    ".modal-quantity-wrap .modal-save-btn"
)

// hide quantity area by default
addQuantity.style.display = "none"
qtyInput.disabled = true
let selectedSizeInMain = null

function setSizeModeForType(typeValue) {
    const isShoes = String(typeValue) === "7"
    if (sizesLetterWrap && sizesNumericWrap && modalSizesLetter && modalSizesNumeric) {
        sizesLetterWrap.style.display = isShoes ? "none" : "flex"
        sizesNumericWrap.style.display = isShoes ? "flex" : "none"
        modalSizesLetter.style.display = isShoes ? "none" : "flex"
        modalSizesNumeric.style.display = isShoes ? "flex" : "none"
    }
}

function clearActiveSizes() {
    document.querySelectorAll(".section__form-size.active-form").forEach(el => el.classList.remove("active-form"))
    document.querySelectorAll(".modal-size-btn.active").forEach(el => el.classList.remove("active"))
    selectedSizeInMain = null
    selectedSizeInModal = null
    updateQuantityVisibility()
}

// THÊM: reset modal previews from tempColorData
function resetModalImages() {
    modalImageItems.forEach((item) => {
        const preview = item.querySelector(".modal-preview-image")
        const plusIcon = item.querySelector(".modal-image-plus")
        if (preview) {
            preview.style.display = "none"
            preview.src = ""
        }
        if (plusIcon) plusIcon.style.display = ""
    })
    if (!tempColorData || !Array.isArray(tempColorData.images)) return
    tempColorData.images.forEach((img, idx) => {
        const item = modalImageItems[idx]
        if (!item) return
        const preview = item.querySelector(".modal-preview-image")
        const plusIcon = item.querySelector(".modal-image-plus")
        plusIcon.style.display = "none"
        preview.style.display = "block"
        preview.src = img instanceof File ? URL.createObjectURL(img) : img
    })
}

// THÊM: create & append one color card
function addColorCard(index) {
    if (!colorCardsContainer) return
    const color = productData.colors[index] || { colorName: "", images: [], sizes: [] }
    const card = document.createElement("div")
    card.className = "add__product-color"
    card.dataset.colorIndex = String(index)

    const plusBlock = document.createElement("div")
    plusBlock.className = "add-card__plus add__product-plus"
    plusBlock.innerHTML = `<svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="M15 6.25V23.75" stroke="#000" stroke-linecap="round"/><path d="M6.25 15H23.75" stroke="#000" stroke-linecap="round"/></svg>`
    card.appendChild(plusBlock)

    const firstImg = (color && color.images && color.images[0]) || null
    if (firstImg) {
        const imgEl = document.createElement("img")
        imgEl.className = "color-thumb-img"
        imgEl.style.width = "100%"
        imgEl.style.height = "100%"
        imgEl.style.objectFit = "cover"
        imgEl.src = firstImg instanceof File ? URL.createObjectURL(firstImg) : firstImg
        plusBlock.appendChild(imgEl)
        const svg = plusBlock.querySelector("svg")
        if (svg) svg.style.display = "none"
    }

    const label = document.createElement("div")
    label.className = "color-card-label"
    label.textContent = color.colorName || ""
    card.appendChild(label)

    colorCardsContainer.appendChild(card)
}

// THÊM: render all color cards (preserve initial add + clone)
function renderColorCards() {
    if (!colorCardsContainer) return
    // Save initial add node if present
    const addTemplate = colorCardsContainer.querySelector(".add__product-color:not([data-color-index])")
    colorCardsContainer.innerHTML = ""
    if (addTemplate) colorCardsContainer.appendChild(addTemplate.cloneNode(true))
    else {
        const plusCard = document.createElement("div")
        plusCard.className = "add__product-color"
        plusCard.innerHTML = `<div class="add-card__plus add__product-plus"><svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="M15 6.25V23.75" stroke="#000"/><path d="M6.25 15H23.75" stroke="#000"/></svg></div>`
        colorCardsContainer.appendChild(plusCard)
    }
    (productData.colors || []).forEach((_, i) => addColorCard(i))
}

function updateQuantityVisibility() {
    // only consider visible size elements
    const selected = Array.from(document.querySelectorAll(".section__form-size")).find(el => el.classList.contains("active-form") && getComputedStyle(el).display !== "none")
    if (selected) {
        addQuantity.style.display = "flex"
        qtyInput.disabled = false
        qtyInput.focus()
        qtyInput.value = ""
        selectedSizeInMain = selected.textContent.trim()
    } else {
        addQuantity.style.display = "none"
        qtyInput.disabled = true
        qtyInput.value = ""
        selectedSizeInMain = null
    }
}
if (colorCardsContainer) {
    colorCardsContainer.addEventListener("click", (e) => {
        const card = e.target.closest(".add__product-color")
        if (!card) return
        const idx = card.dataset.colorIndex
        if (typeof idx === "undefined") {
            // add new color
            editingColorIndex = null
            tempColorData = { colorName: "", images: [], sizes: [] }
        } else {
            editingColorIndex = Number(idx)
            tempColorData = JSON.parse(JSON.stringify(productData.colors[editingColorIndex] || { colorName: "", images: [], sizes: [] }))
        }
        modalColorInput.value = tempColorData.colorName || ""
        resetModalImages()
        // ensure modal uses the correct type set
        setSizeModeForType(typeSelect.value)
        modal.classList.add("active")
    })
}
// initialize mode
if (typeSelect) {
    setSizeModeForType(typeSelect.value)
    typeSelect.addEventListener("change", function () {
        setSizeModeForType(this.value)
        // clear actives when change type
        clearActiveSizes()
    })
}

// event delegation for main sizes
if (sizesContainer) {
    sizesContainer.addEventListener("click", function (e) {
        const option = e.target.closest(".section__form-size")
        if (!option) return
        // ignore hidden ones (e.g., numeric vs letter)
        if (getComputedStyle(option).display === "none") return
        const isActive = option.classList.contains("active-form")
        // remove active on all (visible or not is okay)
        document.querySelectorAll(".section__form-size").forEach((opt) => opt.classList.remove("active-form"))
        if (!isActive) option.classList.add("active-form")
        updateQuantityVisibility()
    })
}

// Save qty in main section
saveQtyBtn.addEventListener("click", function () {
    if (!selectedSizeInMain || !qtyInput.value.trim()) {
        alert("Please select size and enter quantity")
        return
    }
    if (productData.colors.length === 0) {
        productData.colors.push({ colorName: "Default", images: [], sizes: [] })
    }
    const color = productData.colors[0]
    const existing = color.sizes.find((s) => s.size === selectedSizeInMain)
    if (existing) existing.quantity = Number(qtyInput.value)
    else
        color.sizes.push({
            size: selectedSizeInMain,
            quantity: Number(qtyInput.value),
        })
    // clear actives
    document.querySelectorAll(".section__form-size").forEach((opt) => opt.classList.remove("active-form"))
    qtyInput.value = ""
    updateQuantityVisibility()
})

// modal size click handling (ignore hidden buttons)
modal.addEventListener("click", function (e) {
    const btn = e.target.closest(".modal-size-btn")
    if (!btn) return
    if (getComputedStyle(btn).display === "none") return
    // select one active (same behavior as before)
    getModalSizeBtns().forEach((b) => b.classList.remove("active"))
    btn.classList.add("active")
    selectedSizeInModal = btn.dataset.size
    const exist = (tempColorData.sizes || []).find((s) => s.size === selectedSizeInModal)
    modalQtyInput.value = exist ? exist.quantity : ""
    modalQtyInput.focus()
})

// existing modal save logic remains OK
modalSaveBtn.addEventListener("click", function () {
    if (!selectedSizeInModal || !modalQtyInput.value.trim()) {
        alert("Please select size and enter quantity")
        return
    }
    if (!modalColorInput.value.trim()) {
        alert("Please enter color name")
        return
    }
    tempColorData.colorName = modalColorInput.value.trim()
    const existing = tempColorData.sizes.find(
        (s) => s.size === selectedSizeInModal
    )
    if (existing) existing.quantity = Number(modalQtyInput.value)
    else
        tempColorData.sizes.push({
            size: selectedSizeInModal,
            quantity: Number(modalQtyInput.value),
        })
    getModalSizeBtns().forEach((b) => b.classList.remove("active"))
    modalQtyInput.value = ""
    selectedSizeInModal = null
})

closeModalBtn.addEventListener("click", function () {
    if (
        !tempColorData ||
        (Array.isArray(tempColorData.sizes) && tempColorData.sizes.length === 0)
    ) {
        alert("Please add at least one size!")
        return
    }
    if (
        editingColorIndex !== null &&
        editingColorIndex !== undefined &&
        Number.isFinite(Number(editingColorIndex))
    ) {
        productData.colors[Number(editingColorIndex)] = tempColorData
        const card = colorCardsContainer.querySelector(
            `.add__product-color[data-color-index="${editingColorIndex}"]`
        )
        if (card) {
            // update thumbnail image for edited color (no label shown)
            const plusBlock = card.querySelector(".add-card__plus")
            if (plusBlock) {
                const first =
                    (tempColorData.images && tempColorData.images[0]) || null
                let src = ""
                if (first) {
                    if (first instanceof File) {
                        try {
                            // revoke previous objectURL if present
                            if (card.dataset.thumbUrl) {
                                try {
                                    URL.revokeObjectURL(card.dataset.thumbUrl)
                                } catch (err) {}
                            }
                            src = URL.createObjectURL(first)
                            card.dataset.thumbUrl = src
                        } catch (e) {
                            src = ""
                        }
                    } else if (typeof first === "string") {
                        src = first
                    }
                }
                if (src) {
                    const svg = plusBlock.querySelector("svg")
                    if (svg) svg.style.display = "none"
                    let img = plusBlock.querySelector(".color-thumb-img")
                    if (!img) {
                        img = document.createElement("img")
                        img.className = "color-thumb-img"
                        img.style.width = "100%"
                        img.style.height = "100%"
                        img.style.objectFit = "cover"
                        plusBlock.appendChild(img)
                    }
                    img.src = src
                } else {
                    // remove thumb if none
                    const img = plusBlock.querySelector(".color-thumb-img")
                    if (img) img.remove()
                    const svg = plusBlock.querySelector("svg")
                    if (svg) svg.style.display = ""
                    delete card.dataset.thumbUrl
                }
            }
            const label = card.querySelector(".color-card-label")
            if (label) label.textContent = tempColorData.colorName || ""
        }
    } else {
        productData.colors.push(tempColorData)
        renderColorCards()
    }
    editingColorIndex = null
    tempColorData = { colorName: "", images: [], sizes: [] }
    resetModalImages()
    modal.classList.remove("active")
})

modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.classList.remove("active")
})

/* Save product (FormData) */
const saveBtn = document.querySelector(".header__save-box")
saveBtn.addEventListener("click", async function () {
    productData.name = productNameInput.value.trim()
    productData.description = descriptionInput.value.trim()
    productData.type = typeSelect.value
    productData.cost = costInput.value.trim()

    if (
        !productData.name ||
        !productData.description ||
        !productData.type ||
        !productData.cost
    ) {
        alert("Please fill all required fields")
        return
    }
    if (productData.colors.length === 0) {
        alert("Please add at least one color with sizes")
        return
    }

    // Normalize sizes: if shoes (type 7) make sure size is numeric string (e.g., "38"),
    // else keep trimmed letter sizes ("M", "XL" etc).
    const isShoes = String(productData.type) === "7"
    productData.colors.forEach((color) => {
        color.sizes = (color.sizes || []).map((s) => {
            return {
                size: isShoes ? String(Number(s.size)) : String(s.size || "").trim(),
                quantity: Number(s.quantity) || 0,
            }
        })
    })

    const formData = new FormData()
    formData.append("ProductName", productData.name)
    formData.append("Descriptions", productData.description)
    formData.append("TypeID", productData.type)
    formData.append("Price", productData.cost)

    productData.mainImages.forEach((file) => {
        if (file) formData.append("mainImages", file)
    })

    productData.colors.forEach((color, ci) => {
        formData.append(`colors[${ci}][colorName]`, color.colorName)
        ;(color.images || []).forEach((file) => {
            if (file) formData.append(`colors[${ci}][images]`, file)
        })
        ;(color.sizes || []).forEach((s, si) => {
            formData.append(`colors[${ci}][sizes][${si}][size]`, s.size)
            formData.append(`colors[${ci}][sizes][${si}][quantity]`, s.quantity)
        })
    })
    try {
        const res = await fetch("/admin/create", {
            method: "POST",
            body: formData,
        })
        const data = await res.json()
        if (res.ok && data.success) {
            alert(
                "Product saved. ID: " +
                    (data.productID || data.productId || "unknown")
            )
            window.location.href = "/admin/show"
        } else {
            console.error("Save failed", data)
            alert("Save failed: " + (data.message || "Unknown"))
        }
    } catch (err) {
        console.error("Request error", err)
        alert("Request error. See console.")
    }
})
