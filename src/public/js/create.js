const productData = {
    name: "",
    description: "",
    type: "",
    cost: "",
    mainImages: [],
    colors: [],
}

let tempColorData = { colorName: "", images: [], sizes: [] }

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

/* Size / quantity main */
const sizeOptions = document.querySelectorAll(".section__form-size")
const addQuantity = document.querySelector(".add_quantity")
const qtyInput = document.querySelector(".add__quantity-input")
const saveQtyBtn = addQuantity.querySelector(".add-save-btn")
const costInput = document.getElementById("add__input-cost")
const typeSelect = document.getElementById("typeSelect")
const productNameInput = document.getElementById("productName")
const descriptionInput = document.getElementById("description")

addQuantity.style.display = "none"
qtyInput.disabled = true
let selectedSizeInMain = null

function updateQuantityVisibility() {
    const selected = document.querySelector(".section__form-size.active-form")
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

sizeOptions.forEach((option) => {
    option.addEventListener("click", function () {
        const isActive = this.classList.contains("active-form")
        sizeOptions.forEach((opt) => opt.classList.remove("active-form"))
        if (!isActive) this.classList.add("active-form")
        updateQuantityVisibility()
    })
})

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
    sizeOptions.forEach((opt) => opt.classList.remove("active-form"))
    qtyInput.value = ""
    updateQuantityVisibility()
})

/* Modal + color cards */
const modal = document.getElementById("colorModal")
const colorCardsContainer = document.getElementById("colorCardsContainer")
const closeModalBtn = document.getElementById("closeModalBtn")
const modalSizeBtns = document.querySelectorAll(".modal-size-btn")
const modalColorInput = document.querySelector(".modal_color")
const modalQtyInput = document.querySelector(".modal-quantity-input")
const modalSaveBtn = document.querySelector(
    ".modal-quantity-wrap .modal-save-btn"
)

let modalRemoveBtn = null

function removeColorAt(index) {
    index = Number(index)
    if (!Number.isFinite(index)) return
    // revoke any objectURL from card
    const card = colorCardsContainer.querySelector(
        `.add__product-color[data-color-index="${index}"]`
    )
    if (card && card.dataset.thumbUrl) {
        try {
            URL.revokeObjectURL(card.dataset.thumbUrl)
        } catch (e) {}
    }
    // remove from data
    productData.colors.splice(index, 1)
    // remove DOM card if present
    if (card) card.remove()
    reindexColorCards()
}

let selectedSizeInModal = null
let editingColorIndex = null

function resetModalImages() {
    modalImageItems.forEach((item) => {
        const input = item.querySelector(".modal-image-input")
        const preview = item.querySelector(".modal-preview-image")
        const plusIcon = item.querySelector(".modal-image-plus")
        input.value = ""
        preview.style.display = "none"
        plusIcon.style.display = "flex"
    })
}

function openNewColorModal(e) {
    e && e.stopPropagation()
    editingColorIndex = null
    tempColorData = { colorName: "", images: [], sizes: [] }
    modalColorInput.value = ""
    modalQtyInput.value = ""
    selectedSizeInModal = null
    modalSizeBtns.forEach((b) => b.classList.remove("active"))
    resetModalImages()
    // hide remove button when creating a new color
    if (modalRemoveBtn) modalRemoveBtn.style.display = "none"
    modal.classList.add("active")
}

function openColorModalForIndex(index) {
    index = Number(index)
    if (!Number.isFinite(index) || !productData.colors[index])
        return openNewColorModal()
    editingColorIndex = index
    // Deep copy while preserving File objects (JSON.stringify loses them)
    const source = productData.colors[index] || {
        colorName: "",
        images: [],
        sizes: [],
    }
    tempColorData = {
        colorName: source.colorName || "",
        images: source.images ? [...source.images] : [],
        sizes: source.sizes
            ? source.sizes.map((s) => ({ size: s.size, quantity: s.quantity }))
            : [],
    }
    modalColorInput.value = tempColorData.colorName || ""
    modalQtyInput.value = ""
    selectedSizeInModal = null
    modalSizeBtns.forEach((b) => b.classList.remove("active"))

    modalImageItems.forEach((item, idx) => {
        const preview = item.querySelector(".modal-preview-image")
        const plusIcon = item.querySelector(".modal-image-plus")
        const file = tempColorData.images && tempColorData.images[idx]
        if (file) {
            if (file instanceof File) {
                const reader = new FileReader()
                reader.onload = (ev) => (preview.src = ev.target.result)
                reader.readAsDataURL(file)
            } else if (typeof file === "string") {
                preview.src = file
            }
            preview.style.display = "block"
            plusIcon.style.display = "none"
        } else {
            preview.style.display = "none"
            plusIcon.style.display = "flex"
        }
    })

    // show size quantities visually (title)
    const map = {}
    ;(tempColorData.sizes || []).forEach((s) => (map[s.size] = s.quantity))
    modalSizeBtns.forEach((btn) => {
        const sz = btn.dataset.size
        if (map[sz]) {
            btn.title = "Qty: " + map[sz]
            btn.style.opacity = "0.7"
        } else {
            btn.title = ""
            btn.style.opacity = ""
        }
    })

    modal.classList.add("active")

    // ensure modal remove button exists and is visible when editing an existing color
    const modalContent = modal.querySelector(".modal-content") || modal
    if (!modalRemoveBtn) {
        modalRemoveBtn = document.createElement("button")
        modalRemoveBtn.type = "button"
        modalRemoveBtn.className = "modal-remove-btn"
        modalRemoveBtn.textContent = "Delete Color"
        modalContent.appendChild(modalRemoveBtn)

        modalRemoveBtn.addEventListener("click", function (ev) {
            ev.stopPropagation()
            if (!confirm("Delete this color? This cannot be undone.")) return
            // remove and close modal
            removeColorAt(editingColorIndex)
            editingColorIndex = null
            tempColorData = { colorName: "", images: [], sizes: [] }
            resetModalImages()
            modal.classList.remove("active")
        })
    }
    // show it (in case previously hidden)
    modalRemoveBtn.style.display = ""
}

function addColorCard(colorIndex) {
    const color = productData.colors[colorIndex] || {}
    const colorCard = document.createElement("div")
    colorCard.className = "add__product-color"
    colorCard.dataset.colorIndex = colorIndex
    const name = (color.colorName && color.colorName.trim()) || "Color"

    // preserve your original structure but show thumbnail if an image was uploaded
    // only show image thumbnail (no color name label)
    colorCard.innerHTML = `<div class="add-card__plus add__product-plus active__product-color">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 6.25V23.75" stroke="#000" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M6.25 15H23.75" stroke="#000" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </div>`

    const plusBlock = colorCard.querySelector(".add-card__plus")
    // if first image exists, render it inside plusBlock (hide svg)
    if (color.images && color.images.length && color.images[0]) {
        const first = color.images[0]
        let src = ""
        if (first instanceof File) {
            try {
                src = URL.createObjectURL(first)
                colorCard.dataset.thumbUrl = src
            } catch (e) {
                src = ""
            }
        } else if (typeof first === "string") {
            src = first
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
        }
    }

    colorCard.addEventListener("click", (ev) => {
        const idx = ev.currentTarget.dataset.colorIndex
        openColorModalForIndex(idx)
    })
    const addNew = colorCardsContainer.querySelector(
        ".add__product-color.add-new"
    )
    if (addNew) colorCardsContainer.insertBefore(colorCard, addNew)
    else colorCardsContainer.appendChild(colorCard)
    reindexColorCards()
}

function reindexColorCards() {
    const cards = Array.from(
        colorCardsContainer.querySelectorAll(".add__product-color")
    )
    const addNew = cards.find((c) => c.classList.contains("add-new"))
    let idx = 0
    cards.forEach((c) => {
        if (c === addNew) return
        c.dataset.colorIndex = idx
        idx++
    })
}

// init: mark first as add-new and attach handler; attach existing card handlers
;(function initColorCards() {
    const first = colorCardsContainer.querySelector(".add__product-color")
    if (first) {
        first.classList.add("add-new")
        first.addEventListener("click", openNewColorModal)
    }
    const existing = colorCardsContainer.querySelectorAll(
        ".add__product-color:not(.add-new)"
    )
    existing.forEach((card, i) => {
        card.dataset.colorIndex = i
        card.addEventListener("click", (ev) => {
            openColorModalForIndex(ev.currentTarget.dataset.colorIndex)
        })
    })
})()

modalSizeBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
        modalSizeBtns.forEach((b) => b.classList.remove("active"))
        this.classList.add("active")
        selectedSizeInModal = this.dataset.size
        const exist = (tempColorData.sizes || []).find(
            (s) => s.size === selectedSizeInModal
        )
        modalQtyInput.value = exist ? exist.quantity : ""
        modalQtyInput.focus()
    })
})

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
    modalSizeBtns.forEach((b) => b.classList.remove("active"))
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
        }
    } else {
        productData.colors.push(tempColorData)
        addColorCard(productData.colors.length - 1)
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
