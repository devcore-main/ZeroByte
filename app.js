/* =============================================
   ZERO BYTE ACADEMY — App Logic (v2)
   Single Plan (Cash/Installment), Booking, Installment Pay
   ============================================= */

// ==========================================
// CONFIGURATION
// ==========================================
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxTPoSDgzzlhwQgmXV0-xOOI-CWOCvKPxBKsgExu5NwDZHrQ3rx3JaavpSqnZsPeFlX/exec";

const CASH_PRICE = 2500;
const INSTALLMENT_TOTAL = 3000;
const INSTALLMENT_EACH = 1000;

let currentPaymentPlan = "cash"; // "cash" or "installment"
let selectedInstallmentNum = null;

// ==========================================
// INIT
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initAccordion();
    initNavbar();
    initScrollAnimations();
});

// ==========================================
// PAYMENT PLAN TOGGLE
// ==========================================
function selectPaymentPlan(plan) {
    currentPaymentPlan = plan;

    const cashBtn = document.getElementById("toggleCash");
    const instBtn = document.getElementById("toggleInstallment");
    const cashDisp = document.getElementById("cashDisplay");
    const instDisp = document.getElementById("installmentDisplay");

    if (plan === "cash") {
        cashBtn.classList.add("active");
        instBtn.classList.remove("active");
        cashDisp.classList.remove("hidden");
        instDisp.classList.add("hidden");
    } else {
        instBtn.classList.add("active");
        cashBtn.classList.remove("active");
        instDisp.classList.remove("hidden");
        cashDisp.classList.add("hidden");
    }
}

// ==========================================
// BOOKING MODAL (New Registration)
// ==========================================
function openBookingModal() {
    const planField = document.getElementById("formPlan");
    const totalField = document.getElementById("formTotal");

    if (currentPaymentPlan === "cash") {
        planField.value = "كاش — دفعة واحدة";
        totalField.value = CASH_PRICE.toLocaleString() + " EGP";
    } else {
        planField.value = "تقسيط — القسط الأول";
        totalField.value = INSTALLMENT_EACH.toLocaleString() + " EGP (من أصل " + INSTALLMENT_TOTAL.toLocaleString() + " EGP)";
    }

    document.getElementById("bookingModal").classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeBookingModal() {
    document.getElementById("bookingModal").classList.remove("active");
    document.body.style.overflow = "";
}

// ==========================================
// INSTALLMENT PAY MODAL (Returning Students)
// ==========================================
function openInstallmentPayModal() {
    document.getElementById("installmentModal").classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeInstallmentPayModal() {
    document.getElementById("installmentModal").classList.remove("active");
    document.body.style.overflow = "";
}

function selectInstallmentNum(num) {
    selectedInstallmentNum = num;
    // Update radio visual
    document.querySelectorAll(".radio-card").forEach(card => card.classList.remove("selected"));
    event.currentTarget.classList.add("selected");
}

// ==========================================
// CLOSE MODALS ON OVERLAY / ESC
// ==========================================
document.addEventListener("click", (e) => {
    if (e.target.id === "bookingModal") closeBookingModal();
    if (e.target.id === "installmentModal") closeInstallmentPayModal();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeBookingModal();
        closeInstallmentPayModal();
    }
});

// ==========================================
// FILE UPLOAD HANDLER
// ==========================================
function handleFileSelect(input, nameElId, areaId) {
    const nameEl = document.getElementById(nameElId);
    const area = document.getElementById(areaId);

    if (input.files && input.files[0]) {
        nameEl.textContent = input.files[0].name;
        area.classList.add("has-file");
    } else {
        nameEl.textContent = "";
        area.classList.remove("has-file");
    }
}

// ==========================================
// CONVERT FILE TO BASE64
// ==========================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // result is "data:image/png;base64,xxxx..."
            const base64 = reader.result.split(",")[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==========================================
// FORM SUBMISSION — New Booking
// ==========================================
async function submitBooking(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("submitBtn");
    const statusEl = document.getElementById("formStatus");

    const name = document.getElementById("formName").value.trim();
    const email = document.getElementById("formEmail").value.trim();
    const phone = document.getElementById("formPhone").value.trim();
    const plan = document.getElementById("formPlan").value;
    const total = document.getElementById("formTotal").value;
    const receipt = document.getElementById("formReceipt").files[0];

    // Validate
    if (!name || !email || !phone || !receipt) {
        statusEl.textContent = "⚠️ يرجى ملء جميع الحقول المطلوبة وإرفاق صورة الإيصال";
        statusEl.className = "form-status error";
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        statusEl.textContent = "⚠️ يرجى إدخال بريد إلكتروني صحيح";
        statusEl.className = "form-status error";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "جاري الإرسال...";
    statusEl.textContent = "";

    try {
        const base64File = await fileToBase64(receipt);

        const payload = {
            type: "new_booking",
            name: name,
            email: email,
            phone: phone,
            paymentPlan: currentPaymentPlan,
            installmentNum: currentPaymentPlan === "cash" ? "full" : "1",
            amountPaid: currentPaymentPlan === "cash" ? CASH_PRICE : INSTALLMENT_EACH,
            totalCourse: currentPaymentPlan === "cash" ? CASH_PRICE : INSTALLMENT_TOTAL,
            receiptBase64: base64File,
            receiptName: receipt.name,
            receiptType: receipt.type
        };

        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            redirect: "follow",
            body: JSON.stringify(payload),
        });

        let result;
        try {
            const text = await response.text();
            result = JSON.parse(text);
        } catch (parseErr) {
            // If we got a response at all, assume success
            result = { status: "success" };
        }

        if (result.status === "success") {
            statusEl.textContent = "✅ تم الحجز بنجاح! سنتواصل معك قريبًا.";
            statusEl.className = "form-status success";
            document.getElementById("bookingForm").reset();
            document.getElementById("fileName").textContent = "";
            document.getElementById("fileUploadArea").classList.remove("has-file");
        } else {
            throw new Error(result.message || "Server error");
        }
    } catch (err) {
        statusEl.textContent = "❌ حدث خطأ أثناء الإرسال. حاول مرة أخرى.";
        statusEl.className = "form-status error";
        console.error("Submission error:", err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "تأكيد الحجز ✓";
    }
}

// ==========================================
// FORM SUBMISSION — Installment Payment
// ==========================================
async function submitInstallment(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("instSubmitBtn");
    const statusEl = document.getElementById("instFormStatus");

    const name = document.getElementById("instName").value.trim();
    const email = document.getElementById("instEmail").value.trim();
    const phone = document.getElementById("instPhone").value.trim();
    const receipt = document.getElementById("instReceipt").files[0];

    const instNumRadio = document.querySelector('input[name="installmentNum"]:checked');
    if (!instNumRadio) {
        statusEl.textContent = "⚠️ يرجى اختيار رقم القسط";
        statusEl.className = "form-status error";
        return;
    }
    const instNum = instNumRadio.value;

    if (!name || !email || !phone || !receipt) {
        statusEl.textContent = "⚠️ يرجى ملء جميع الحقول المطلوبة وإرفاق صورة الإيصال";
        statusEl.className = "form-status error";
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        statusEl.textContent = "⚠️ يرجى إدخال بريد إلكتروني صحيح";
        statusEl.className = "form-status error";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "جاري الإرسال...";
    statusEl.textContent = "";

    try {
        const base64File = await fileToBase64(receipt);

        const payload = {
            type: "installment_payment",
            name: name,
            email: email,
            phone: phone,
            paymentPlan: "installment",
            installmentNum: instNum,
            amountPaid: INSTALLMENT_EACH,
            totalCourse: INSTALLMENT_TOTAL,
            receiptBase64: base64File,
            receiptName: receipt.name,
            receiptType: receipt.type
        };

        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            redirect: "follow",
            body: JSON.stringify(payload),
        });

        let result;
        try {
            const text = await response.text();
            result = JSON.parse(text);
        } catch (parseErr) {
            result = { status: "success" };
        }

        if (result.status === "success") {
            statusEl.textContent = "✅ تم تأكيد دفع القسط بنجاح!";
            statusEl.className = "form-status success";
            document.getElementById("installmentForm").reset();
            document.getElementById("instFileName").textContent = "";
            document.getElementById("instFileUploadArea").classList.remove("has-file");
            document.querySelectorAll(".radio-card").forEach(c => c.classList.remove("selected"));
        } else {
            throw new Error(result.message || "Server error");
        }
    } catch (err) {
        statusEl.textContent = "❌ حدث خطأ أثناء الإرسال. حاول مرة أخرى.";
        statusEl.className = "form-status error";
        console.error("Submission error:", err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "تأكيد دفع القسط ✓";
    }
}

// ==========================================
// ACCORDION (Syllabus)
// ==========================================
function initAccordion() {
    document.querySelectorAll(".module-header").forEach(header => {
        header.addEventListener("click", () => {
            const item = header.parentElement;
            const isActive = item.classList.contains("active");
            document.querySelectorAll(".module-item").forEach(mi => mi.classList.remove("active"));
            if (!isActive) item.classList.add("active");
        });
    });
}

// ==========================================
// NAVBAR
// ==========================================
function initNavbar() {
    const navbar = document.getElementById("navbar");
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("navLinks");

    window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 50);
    });

    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navLinks.classList.toggle("open");
    });

    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navLinks.classList.remove("open");
        });
    });
}

// ==========================================
// SCROLL ANIMATIONS
// ==========================================
function initScrollAnimations() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add("visible");
            });
        },
        { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

// ==========================================
// COLLABORATION FORM HANDLING
// ==========================================
async function handleCollabSubmission(e) {
    e.preventDefault();
    const statusEl = document.getElementById("collabStatus");
    const name = document.getElementById("collabName").value.trim();
    const email = document.getElementById("collabEmail").value.trim();
    const type = document.getElementById("collabType").value;
    const message = document.getElementById("collabMessage").value.trim();

    statusEl.textContent = "Sending proposal...";
    statusEl.className = "form-status";

    try {
        const payload = {
            type: "collaboration_proposal",
            name, email, collaborationType: type, message
        };
        await fetch(WEBHOOK_URL, { method: "POST", body: JSON.stringify(payload) });
        statusEl.textContent = "✅ Proposal sent! We'll be in touch.";
        statusEl.className = "form-status success";
        e.target.reset();
    } catch (err) {
        statusEl.textContent = "❌ Error sending proposal. Please try again.";
        statusEl.className = "form-status error";
    }
}

// ==========================================
// CONTACT FORM HANDLING
// ==========================================
async function handleContactSubmission(e) {
    e.preventDefault();
    const statusEl = document.getElementById("contactStatus");
    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const subject = document.getElementById("contactSubject").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    statusEl.textContent = "Sending message...";
    statusEl.className = "form-status";

    try {
        const payload = {
            type: "contact_us",
            name, email, subject, message
        };
        await fetch(WEBHOOK_URL, { method: "POST", body: JSON.stringify(payload) });
        statusEl.textContent = "✅ Message sent successfully!";
        statusEl.className = "form-status success";
        e.target.reset();
    } catch (err) {
        statusEl.textContent = "❌ Error sending message. Please try again.";
        statusEl.className = "form-status error";
    }
}