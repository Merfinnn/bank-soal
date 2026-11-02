const campus = [
  { code: "FKIP", name: "Fakultas Keguruan dan Ilmu Pendidikan (FKIP)", programs: ["Pendidikan Bahasa Indonesia", "Pendidikan Bahasa Inggris", "Pendidikan Matematika", "Pendidikan Biologi", "Pendidikan Fisika", "Pendidikan Ekonomi", "Pendidikan Geografi", "Pendidikan Sejarah", "Pendidikan Jasmani", "Pendidikan Masyarakat"] },
  { code: "FEB", name: "Fakultas Ekonomi dan Bisnis (FEB)", programs: ["S1 Manajemen", "S1 Akuntansi", "S1 Ekonomi Pembangunan", "D3 Perbankan dan Keuangan", "D4 Perbankan dan Keuangan Digital"] },
  { code: "FT", name: "Fakultas Teknik (FT)", programs: ["Teknik Sipil", "Teknik Elektro", "Informatika", "Sistem Informasi", "Sains Data"] },
  { code: "FP", name: "Fakultas Pertanian (FP)", programs: ["Agribisnis", "Agroteknologi", "Teknologi Pangan dan Hasil Pertanian"] },
  { code: "FIK", name: "Fakultas Ilmu Kesehatan (FIK)", programs: ["Kesehatan Masyarakat", "Gizi"] },
  { code: "FAI", name: "Fakultas Agama Islam (FAI)", programs: ["Ekonomi Syariah", "Manajemen Mutu Halal"] },
  { code: "FISIP", name: "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)", programs: ["Ilmu Politik", "Hukum Bisnis"] }
];

const papers = [
  { id: 1, faculty: "FT", department: "Informatika", course: "Struktur Data", code: "IF204", semester: 4, year: 2024, exam: "UTS", topic: "Tree dan Graph", type: "Esai Terstruktur", difficulty: "Sedang", explanation: true, verified: true, pdf: true, count: 348, icon: "⌘", tint: "violet", teacher: "Dra. Rina Kusuma, M.Kom." },
  { id: 2, faculty: "FEB", department: "S1 Manajemen", course: "Pengantar Manajemen", code: "MN101", semester: 1, year: 2023, exam: "UAS", topic: "Perencanaan Organisasi", type: "Studi Kasus", difficulty: "Sedang", explanation: true, verified: true, pdf: true, count: 291, icon: "▦", tint: "blue", teacher: "Budi Santoso, S.E., M.M." },
  { id: 3, faculty: "FKIP", department: "Pendidikan Matematika", course: "Kalkulus Diferensial", code: "PM203", semester: 2, year: 2025, exam: "UTS", topic: "Turunan Fungsi", type: "Hitungan", difficulty: "Sulit", explanation: true, verified: true, pdf: true, count: 412, icon: "∑", tint: "mint", teacher: "Dr. Maya Putri, M.Pd." },
  { id: 4, faculty: "FP", department: "Agribisnis", course: "Ekonomi Pertanian", code: "AG301", semester: 4, year: 2024, exam: "UAS", topic: "Analisis Usaha Tani", type: "Studi Kasus", difficulty: "Sedang", explanation: false, verified: true, pdf: true, count: 176, icon: "⌂", tint: "peach", teacher: "Dra. Rina Kusuma, M.P." },
  { id: 5, faculty: "FIK", department: "Kesehatan Masyarakat", course: "Epidemiologi Dasar", code: "KM202", semester: 3, year: 2024, exam: "UTS", topic: "Ukuran Frekuensi Penyakit", type: "Pilihan Ganda", difficulty: "Mudah", explanation: true, verified: true, pdf: false, count: 223, icon: "＋", tint: "blue", teacher: "Andi Wijaya, S.K.M., M.Kes." },
  { id: 6, faculty: "FAI", department: "Ekonomi Syariah", course: "Fiqih Muamalah", code: "ES204", semester: 4, year: 2025, exam: "UAS", topic: "Akad Jual Beli", type: "Esai Terstruktur", difficulty: "Sedang", explanation: true, verified: true, pdf: true, count: 189, icon: "◇", tint: "violet", teacher: "Dr. Maya Putri, M.E." },
  { id: 7, faculty: "FISIP", department: "Ilmu Politik", course: "Pengantar Ilmu Politik", code: "IP101", semester: 1, year: 2023, exam: "UTS", topic: "Sistem Politik Indonesia", type: "Esai Terstruktur", difficulty: "Sedang", explanation: true, verified: true, pdf: true, count: 134, icon: "▧", tint: "peach", teacher: "Dewi Anggraini, M.Si." },
  { id: 8, faculty: "FKIP", department: "Pendidikan Bahasa Indonesia", course: "Linguistik Umum", code: "BI201", semester: 3, year: 2022, exam: "UAS", topic: "Morfologi Bahasa", type: "Pilihan Ganda", difficulty: "Mudah", explanation: false, verified: false, pdf: true, count: 96, icon: "Aa", tint: "mint", teacher: "Andi Wijaya, M.Pd." },
  { id: 9, faculty: "FEB", department: "S1 Akuntansi", course: "Akuntansi Keuangan", code: "AK202", semester: 3, year: 2025, exam: "UTS", topic: "Laporan Keuangan", type: "Hitungan", difficulty: "Sulit", explanation: true, verified: true, pdf: true, count: 204, icon: "▤", tint: "peach", teacher: "Dewi Anggraini, S.Ak., M.Ak." },
  { id: 10, faculty: "FT", department: "Sistem Informasi", course: "Analisis Proses Bisnis", code: "SI202", semester: 4, year: 2023, exam: "UAS", topic: "Pemodelan Proses", type: "Studi Kasus", difficulty: "Sedang", explanation: true, verified: true, pdf: false, count: 119, icon: "⌁", tint: "blue", teacher: "Budi Santoso, M.Kom." },
  { id: 11, faculty: "FIK", department: "Gizi", course: "Ilmu Gizi Dasar", code: "GZ101", semester: 1, year: 2022, exam: "UTS", topic: "Zat Gizi Makro", type: "Pilihan Ganda", difficulty: "Mudah", explanation: true, verified: true, pdf: true, count: 87, icon: "✳", tint: "mint", teacher: "Dr. Maya Putri, M.Gizi." },
  { id: 12, faculty: "FT", department: "Sains Data", course: "Statistika Dasar", code: "SD201", semester: 2, year: 2024, exam: "UAS", topic: "Distribusi Probabilitas", type: "Hitungan", difficulty: "Sulit", explanation: true, verified: true, pdf: true, count: 157, icon: "∑", tint: "violet", teacher: "Dra. Rina Kusuma, M.Si." }
];
const additionalCourses = [
  ["Pendidikan Bahasa Inggris", "Grammar and Writing"],
  ["Pendidikan Biologi", "Biologi Sel"],
  ["Pendidikan Fisika", "Mekanika Dasar"],
  ["Pendidikan Ekonomi", "Ekonomi Mikro"],
  ["Pendidikan Geografi", "Geografi Fisik"],
  ["Pendidikan Sejarah", "Sejarah Indonesia"],
  ["Pendidikan Jasmani", "Anatomi dan Fisiologi Olahraga"],
  ["Pendidikan Masyarakat", "Pendidikan Nonformal"],
  ["S1 Ekonomi Pembangunan", "Ekonomi Makro"],
  ["D3 Perbankan dan Keuangan", "Operasional Perbankan"],
  ["D4 Perbankan dan Keuangan Digital", "Teknologi Keuangan Digital"],
  ["Teknik Sipil", "Mekanika Teknik"],
  ["Teknik Elektro", "Rangkaian Listrik"],
  ["Agroteknologi", "Dasar Agronomi"],
  ["Teknologi Pangan dan Hasil Pertanian", "Kimia Pangan"],
  ["Manajemen Mutu Halal", "Sistem Jaminan Produk Halal"],
  ["Hukum Bisnis", "Dasar Hukum Bisnis"]
];
additionalCourses.forEach(([department, course], index) => {
  const faculty = campus.find((item) => item.programs.includes(department));
  papers.push({
    id: papers.length + 1,
    faculty: faculty.code,
    department,
    course,
    code: `${faculty.code}${String(index + 301)}`,
    semester: index % 8 + 1,
    year: 2022 + index % 4,
    exam: index % 2 ? "UAS" : "UTS",
    topic: `Konsep ${course}`,
    type: index % 2 ? "Esai Terstruktur" : "Pilihan Ganda",
    difficulty: index % 3 ? "Sedang" : "Sulit",
    explanation: index % 4 !== 0,
    verified: true,
    pdf: index % 3 !== 0,
    count: 64 + index * 13,
    icon: faculty.code.slice(0, 2),
    tint: ["violet", "blue", "mint", "peach"][index % 4],
    teacher: "Pengajar mata kuliah"
  });
});

const viewNames = ["beranda", "jelajah", "belajar", "kontribusi"];
let currentStep = 1;
let currentUploadMode = "dokumen";
let questionPreviewUrl = null;
let solutionPreviewUrl = null;
let selectedPaper = papers[0];
const selectedVotes = new Set();
const htmlEscape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const facultyByCode = (code) => campus.find((faculty) => faculty.code === code);

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 3000);
}

function navigate(viewName) {
  if (!viewNames.includes(viewName)) return;
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.dataset.view === viewName;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  window.location.hash = viewName === "belajar" ? "jelajah" : viewName;
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewName === "jelajah") renderPapers();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  navigate(button.dataset.view);
  if (button.dataset.view === "kontribusi") resetUpload();
});

function populateFacultySelect(select, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>${campus.map((faculty) =>
    `<option value="${faculty.code}">${htmlEscape(faculty.name)}</option>`).join("")}`;
}

function populateDepartments(select, facultyCode, placeholder) {
  const faculty = facultyByCode(facultyCode);
  select.innerHTML = `<option value="">${placeholder}</option>${(faculty?.programs ?? []).map((program) =>
    `<option value="${htmlEscape(program)}">${htmlEscape(program)}</option>`).join("")}`;
  select.disabled = !faculty;
}

function populateCourses(select, department, placeholder) {
  const names = [...new Set(papers.filter((paper) => paper.department === department).map((paper) => paper.course))];
  select.innerHTML = `<option value="">${placeholder}</option>${names.map((name) =>
    `<option value="${htmlEscape(name)}">${htmlEscape(name)}</option>`).join("")}`;
  select.disabled = names.length === 0;
}

function renderFacultyCards() {
  document.querySelector("#faculty-grid").innerHTML = campus.map((faculty, index) => `
    <button class="faculty-card faculty-tone-${index + 1}" type="button" data-faculty="${faculty.code}">
      <span class="faculty-card-mark">${faculty.code}</span><b>${htmlEscape(faculty.name.replace(` (${faculty.code})`, ""))}</b>
      <small>${faculty.programs.length} program studi <span>→</span></small>
    </button>`).join("");
  document.querySelectorAll(".faculty-card").forEach((card) => card.addEventListener("click", () => {
    document.querySelector("#filter-faculty").value = card.dataset.faculty;
    updateFilterDepartments();
    navigate("jelajah");
  }));
}

populateFacultySelect(document.querySelector("#home-faculty"), "Pilih fakultas");
populateFacultySelect(document.querySelector("#filter-faculty"), "Semua fakultas");
populateFacultySelect(document.querySelector("#upload-faculty"), "Pilih fakultas");
renderFacultyCards();

document.querySelector("#home-faculty").addEventListener("change", (event) => {
  populateDepartments(document.querySelector("#home-department"), event.target.value, "Pilih program studi");
  document.querySelector("#home-course").innerHTML = '<option value="">Pilih mata kuliah</option>';
  document.querySelector("#home-course").disabled = true;
  document.querySelector("#guided-search").disabled = true;
});
document.querySelector("#home-department").addEventListener("change", (event) => {
  populateCourses(document.querySelector("#home-course"), event.target.value, "Pilih mata kuliah");
  document.querySelector("#guided-search").disabled = true;
});
document.querySelector("#home-course").addEventListener("change", (event) => {
  document.querySelector("#guided-search").disabled = !event.target.value;
});
document.querySelector("#guided-search").addEventListener("click", () => {
  document.querySelector("#filter-faculty").value = document.querySelector("#home-faculty").value;
  updateFilterDepartments();
  document.querySelector("#filter-department").value = document.querySelector("#home-department").value;
  document.querySelector("#catalog-search").value = document.querySelector("#home-course").value;
  navigate("jelajah");
});

function updateFilterDepartments() {
  const filterFaculty = document.querySelector("#filter-faculty");
  const department = document.querySelector("#filter-department");
  const faculty = facultyByCode(filterFaculty.value);
  department.innerHTML = `<option value="">${faculty ? "Semua program studi" : "Semua program studi"}</option>${(faculty?.programs ?? []).map((program) =>
    `<option value="${htmlEscape(program)}">${htmlEscape(program)}</option>`).join("")}`;
  department.disabled = !faculty;
}

document.querySelector("#filter-faculty").addEventListener("change", () => {
  updateFilterDepartments();
  renderPapers();
});

function searchMatches(paper, query) {
  const faculty = facultyByCode(paper.faculty);
  const text = [paper.course, paper.code, paper.topic, paper.teacher, paper.department, paper.exam, faculty?.name, faculty?.code].join(" ").toLocaleLowerCase("id");
  return text.includes(query);
}

function readFilters() {
  return {
    query: document.querySelector("#catalog-search").value.trim().toLocaleLowerCase("id"),
    faculty: document.querySelector("#filter-faculty").value,
    department: document.querySelector("#filter-department").value,
    semester: Number(document.querySelector("#filter-semester").value) || null,
    discussion: document.querySelector("#filter-discussion").value,
    sort: document.querySelector("#sort-select").value
  };
}

function renderPapers() {
  const filters = readFilters();
  let matches = papers.filter((paper) =>
    (!filters.query || searchMatches(paper, filters.query))
    && (!filters.faculty || paper.faculty === filters.faculty)
    && (!filters.department || paper.department === filters.department)
    && (!filters.semester || paper.semester === filters.semester)
    && (!filters.discussion || (filters.discussion === "ada" ? paper.explanation : !paper.explanation)));
  if (filters.sort === "newest") matches.sort((a, b) => b.year - a.year || b.count - a.count);
  else if (filters.sort === "oldest") matches.sort((a, b) => a.year - b.year || b.count - a.count);
  else matches.sort((a, b) => b.count - a.count);

  document.querySelector("#result-count").textContent = String(matches.length);
  const activeFaculty = facultyByCode(filters.faculty);
  document.querySelector("#catalog-summary").textContent = activeFaculty
    ? `${activeFaculty.name}${filters.department ? ` · ${filters.department}` : ""}${filters.semester ? ` · Semester ${filters.semester}` : ""}`
    : "Pilih filter fakultas, program studi, atau semester.";
  document.querySelector("#question-grid").innerHTML = matches.map((paper) => {
    const faculty = facultyByCode(paper.faculty);
    return `<article class="catalog-card">
      <div class="catalog-card-top"><span class="course-symbol ${paper.tint}">${paper.icon}</span><span class="paper-type">${paper.exam} · ${paper.year}</span><span class="course-code">${paper.code}</span></div>
      <div class="catalog-card-title"><h3>${htmlEscape(paper.course)}</h3></div><p class="catalog-card-topic">${htmlEscape(paper.topic)}</p>
      <div class="paper-path"><span>${htmlEscape(faculty.code)}</span><span>${htmlEscape(paper.department)}</span><span>Semester ${paper.semester}</span></div>
      <div class="catalog-tags"><span>${paper.explanation ? "Tersedia Pembahasan" : "Soal Mentah"}</span>${paper.pdf ? "<span>PDF Dokumen</span>" : "<span>Soal Digital</span>"}</div>
      <div class="catalog-card-bottom"><div class="card-quality">${paper.verified ? '<span class="verified-badge"><i>✓</i> Terverifikasi</span>' : '<span class="unverified-badge">Menunggu verifikasi</span>'}<span class="paper-year">Tahun ${paper.year}</span></div><div class="card-difficulty"><span class="difficulty-dot ${paper.difficulty.toLowerCase()}"></span>${paper.difficulty}</div></div>
      <div class="catalog-card-footer"><span>◉ ${paper.count} kali dipelajari</span><button type="button" class="open-question" data-paper="${paper.id}">Buka arsip <span>→</span></button></div>
    </article>`;
  }).join("");
  document.querySelector("#empty-state").hidden = matches.length > 0;
  document.querySelectorAll(".open-question").forEach((button) => button.addEventListener("click", () => openPaper(Number(button.dataset.paper))));
}

function openPaper(id) {
  selectedPaper = papers.find((paper) => paper.id === id) ?? papers[0];
  const faculty = facultyByCode(selectedPaper.faculty);
  document.querySelector("#judul-belajar").textContent = selectedPaper.course;
  document.querySelector("#study-paper-meta").textContent = `${selectedPaper.exam === "UTS" ? "UJIAN TENGAH SEMESTER" : "UJIAN AKHIR SEMESTER"} · ${selectedPaper.year}`;
  document.querySelector("#study-course-meta").textContent = `${faculty.name} · ${selectedPaper.department} · Semester ${selectedPaper.semester} · Topik: ${selectedPaper.topic}`;
  document.querySelector("#study-question-title").textContent = selectedPaper.topic;
  document.querySelector("#study-question-text").textContent = `${selectedPaper.course} (${selectedPaper.code}) · ${selectedPaper.exam} ${selectedPaper.year}. Arsip digital soal untuk topik ${selectedPaper.topic}. Gunakan dokumen pratinjau dan pembahasan untuk berlatih.`;
  const frame = document.querySelector("#document-frame");
  const textView = document.querySelector("#study-document .problem-content");
  if (selectedPaper.previewUrl) {
    frame.hidden = false;
    textView.hidden = true;
    frame.innerHTML = selectedPaper.previewType === "image"
      ? `<img class="study-image-preview" src="${selectedPaper.previewUrl}" alt="Pratinjau dokumen soal yang diunggah">`
      : `<iframe title="Pratinjau PDF soal" src="${selectedPaper.previewUrl}"></iframe>`;
  } else if (selectedPaper.pdf) {
    frame.hidden = false;
    textView.hidden = true;
    frame.innerHTML = `<div class="document-placeholder"><span>▤</span><h3>Dokumen arsip PDF</h3><p>Ini arsip contoh. Berkas unggahan dapat dipratinjau langsung sebelum dikirim ke moderator.</p><button class="button button-outline" type="button" data-view="kontribusi">Unggah dokumen</button></div>`;
  } else {
    frame.hidden = true;
    textView.hidden = false;
  }
  navigate("belajar");
}

document.querySelectorAll("#catalog-search, #filter-department, #filter-semester, #filter-discussion, #sort-select").forEach((control) => {
  control.addEventListener("input", renderPapers);
  control.addEventListener("change", renderPapers);
});
document.querySelector("#reset-filters").addEventListener("click", resetFilters);
document.querySelector("#empty-reset").addEventListener("click", resetFilters);

function resetFilters() {
  document.querySelector("#catalog-search").value = "";
  document.querySelector("#filter-faculty").value = "";
  updateFilterDepartments();
  document.querySelector("#filter-department").value = "";
  document.querySelector("#filter-semester").value = "";
  document.querySelector("#filter-discussion").value = "";
  document.querySelector("#sort-select").value = "popular";
  renderPapers();
}

document.querySelectorAll(".search-chip").forEach((button) => button.addEventListener("click", () => {
  document.querySelector("#catalog-search").value = button.dataset.query;
  navigate("jelajah");
}));

const heroSearch = document.querySelector("#hero-search");
const suggestions = document.querySelector("#search-suggestions");
heroSearch.addEventListener("input", () => {
  const query = heroSearch.value.trim().toLocaleLowerCase("id");
  const matches = query ? papers.filter((paper) => searchMatches(paper, query)).slice(0, 5) : [];
  suggestions.innerHTML = matches.map((paper) => `
    <button class="suggestion-option" type="button" role="option" data-paper="${paper.id}">
      <span class="suggestion-icon ${paper.tint}">${paper.icon}</span><span><b>${htmlEscape(paper.course)}</b><small>${htmlEscape(paper.code)} · ${htmlEscape(paper.topic)}</small></span><span class="suggestion-arrow">↗</span>
    </button>`).join("");
  suggestions.classList.toggle("open", matches.length > 0);
  suggestions.querySelectorAll(".suggestion-option").forEach((button) => button.addEventListener("click", () => {
    openPaper(Number(button.dataset.paper));
    suggestions.classList.remove("open");
  }));
});
heroSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    document.querySelector("#catalog-search").value = heroSearch.value;
    suggestions.classList.remove("open");
    navigate("jelajah");
  } else if (event.key === "Escape") suggestions.classList.remove("open");
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".hero-search")) suggestions.classList.remove("open");
});

function renderPopularPapers() {
  document.querySelector("#popular-papers").innerHTML = [...papers].sort((a, b) => b.count - a.count).slice(0, 2).map((paper) => `
    <button class="popular-paper" type="button" data-paper="${paper.id}"><span class="course-symbol ${paper.tint}">${paper.icon}</span><span><b>${htmlEscape(paper.course)}</b><small>${paper.exam} ${paper.year} · ${paper.count} kali dipelajari</small></span><span class="popular-arrow">→</span></button>`).join("");
  document.querySelectorAll(".popular-paper").forEach((button) => button.addEventListener("click", () => openPaper(Number(button.dataset.paper))));
}
renderPopularPapers();
document.querySelectorAll("[data-open-course]").forEach((button) => button.addEventListener("click", () => {
  document.querySelector("#catalog-search").value = button.dataset.openCourse;
  navigate("jelajah");
}));

const today = new Date();
today.setHours(0, 0, 0, 0);
const examDate = new Date(today);
examDate.setDate(examDate.getDate() + 16);
document.querySelector("#countdown-days").textContent = "16";
document.querySelector("#exam-countdown-date").textContent = examDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
if (typeof renderMathInElement === "function") {
  renderMathInElement(document.querySelector("#view-belajar"), {
    delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }],
    throwOnError: false
  });
}

document.querySelectorAll(".solution-tab").forEach((tab) => tab.addEventListener("click", () => {
  const discussion = tab.dataset.tab === "diskusi";
  document.querySelectorAll(".solution-tab").forEach((item) => {
    const active = item === tab;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
  });
  document.querySelector("#tab-pembahasan").hidden = discussion;
  document.querySelector("#tab-diskusi").hidden = !discussion;
}));
document.querySelector("#save-question").addEventListener("click", (event) => {
  const saved = event.currentTarget.classList.toggle("saved");
  event.currentTarget.innerHTML = saved ? "<span>♥</span> Soal tersimpan" : "<span>♡</span> Simpan soal";
  showToast(saved ? "Soal ditambahkan ke simpananmu." : "Soal dihapus dari simpanan.");
});
document.querySelector("#open-document").addEventListener("click", () => {
  const documentUrl = selectedPaper.previewUrl;
  if (!documentUrl) {
    showToast(selectedPaper.pdf ? "Pratinjau arsip contoh tersedia saat berkas diunggah." : "Arsip ini tersedia sebagai soal digital.");
    return;
  }
  window.open(documentUrl, "_blank", "noopener,noreferrer");
});
document.querySelectorAll("[data-vote]").forEach((button) => button.addEventListener("click", () => {
  const key = `${button.dataset.vote}-${button.closest(".difficulty-callout") ? "difficulty" : "solution"}`;
  if (selectedVotes.has(key)) return showToast("Penilaianmu sudah tercatat.");
  selectedVotes.add(key);
  button.classList.add("selected");
  showToast("Terima kasih, penilaianmu membantu mahasiswa lain.");
}));
document.querySelector("#comment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#comment-input");
  if (!input.value.trim()) return showToast("Tulis tanggapan terlebih dahulu.");
  showToast("Tanggapanmu ditambahkan ke diskusi.");
  input.value = "";
});

function formatFileSize(size) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function validFileType(file, allowedExtensions) {
  const extension = file.name.split(".").pop().toLocaleLowerCase("id");
  const expectedMime = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" }[extension];
  return allowedExtensions.includes(extension) && (!file.type || file.type === expectedMime);
}

function handleFile(input, kind) {
  const file = input.files?.[0];
  if (!file) return;
  const allowed = kind === "question" ? ["pdf", "png", "jpg", "jpeg"] : ["pdf"];
  if (!validFileType(file, allowed)) {
    clearFile(kind);
    showToast(kind === "question" ? "Pilih berkas PDF, PNG, atau JPG." : "Berkas pembahasan harus berformat PDF.");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    clearFile(kind);
    showToast("Ukuran berkas melebihi batas 15 MB.");
    return;
  }
  if (kind === "question" && questionPreviewUrl) URL.revokeObjectURL(questionPreviewUrl);
  if (kind === "solution" && solutionPreviewUrl) URL.revokeObjectURL(solutionPreviewUrl);
  const previewUrl = URL.createObjectURL(file);
  if (kind === "question") {
    questionPreviewUrl = previewUrl;
    document.querySelector("#question-file-summary").hidden = false;
    document.querySelector("#question-file-name").textContent = file.name;
    document.querySelector("#question-file-size").textContent = formatFileSize(file.size);
    renderDocumentPreview(file, previewUrl);
  } else {
    solutionPreviewUrl = previewUrl;
    document.querySelector("#solution-file-summary").hidden = false;
    document.querySelector("#solution-file-name").textContent = file.name;
    document.querySelector("#solution-file-size").textContent = formatFileSize(file.size);
  }
}

function renderDocumentPreview(file, url) {
  const isPdf = file.name.toLocaleLowerCase("id").endsWith(".pdf");
  const preview = document.querySelector("#question-preview");
  document.querySelector("#preview-file-type").textContent = isPdf ? "PDF" : "Gambar";
  preview.innerHTML = isPdf
    ? `<iframe title="Pratinjau PDF soal" src="${url}"></iframe>`
    : `<img src="${url}" alt="Pratinjau berkas soal ${htmlEscape(file.name)}">`;
}

function clearFile(kind) {
  if (kind === "question") {
    if (questionPreviewUrl) URL.revokeObjectURL(questionPreviewUrl);
    questionPreviewUrl = null;
    document.querySelector("#question-file").value = "";
    document.querySelector("#question-file-summary").hidden = true;
    document.querySelector("#preview-file-type").textContent = "Belum ada berkas";
    document.querySelector("#question-preview").innerHTML = '<div class="preview-empty"><span>▤</span><b>Dokumenmu tampil di sini</b><small>PDF atau foto akan dipratinjau setelah dipilih.</small></div>';
  } else {
    if (solutionPreviewUrl) URL.revokeObjectURL(solutionPreviewUrl);
    solutionPreviewUrl = null;
    document.querySelector("#solution-file").value = "";
    document.querySelector("#solution-file-summary").hidden = true;
  }
}

document.querySelector("#question-file").addEventListener("change", (event) => handleFile(event.currentTarget, "question"));
document.querySelector("#solution-file").addEventListener("change", (event) => handleFile(event.currentTarget, "solution"));
document.querySelector("#remove-question-file").addEventListener("click", () => clearFile("question"));
document.querySelector("#remove-solution-file").addEventListener("click", () => clearFile("solution"));
const dropzone = document.querySelector("#question-dropzone");
dropzone.addEventListener("click", () => document.querySelector("#question-file").click());
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    document.querySelector("#question-file").click();
  }
});
["dragenter", "dragover"].forEach((type) => dropzone.addEventListener(type, (event) => {
  event.preventDefault();
  dropzone.classList.add("drag-over");
}));
["dragleave", "drop"].forEach((type) => dropzone.addEventListener(type, (event) => {
  event.preventDefault();
  dropzone.classList.remove("drag-over");
}));
dropzone.addEventListener("drop", (event) => {
  const files = event.dataTransfer?.files;
  if (!files?.length) return;
  const transfer = new DataTransfer();
  transfer.items.add(files[0]);
  document.querySelector("#question-file").files = transfer.files;
  handleFile(document.querySelector("#question-file"), "question");
});

function switchUploadMode(mode) {
  currentUploadMode = mode;
  document.querySelectorAll(".upload-mode").forEach((button) => {
    const active = button.dataset.uploadMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  const manual = mode === "manual";
  document.querySelector("#question-dropzone").hidden = manual;
  document.querySelector("#question-file-summary").hidden = manual || !document.querySelector("#question-file").files.length;
  document.querySelector(".manual-question-field").hidden = !manual;
  document.querySelector("#upload-step-title").textContent = manual ? "Tulis soal dan pembahasan" : "Unggah dokumen soal";
  document.querySelector("#upload-step-description").textContent = manual
    ? "Tuliskan soal secara terstruktur atau lampirkan foto lembar soal."
    : "Pilih berkas hasil pindai atau PDF untuk disertakan di arsip.";
  document.querySelector("#upload-question-text").required = manual;
}
document.querySelectorAll(".upload-mode").forEach((button) => button.addEventListener("click", () => switchUploadMode(button.dataset.uploadMode)));

populateFacultySelect(document.querySelector("#upload-faculty"), "Pilih fakultas");
document.querySelector("#upload-faculty").addEventListener("change", (event) => {
  populateDepartments(document.querySelector("#upload-department"), event.target.value, "Pilih program studi");
  document.querySelector("#upload-course").innerHTML = '<option value="">Pilih mata kuliah</option>';
  document.querySelector("#upload-course").disabled = true;
});
document.querySelector("#upload-department").addEventListener("change", (event) => {
  populateCourses(document.querySelector("#upload-course"), event.target.value, "Pilih mata kuliah");
});

function setStep(step) {
  currentStep = step;
  document.querySelectorAll(".wizard-page").forEach((page) => page.classList.toggle("active", Number(page.dataset.step) === step));
  document.querySelectorAll(".wizard-step").forEach((item) => {
    const number = Number(item.dataset.stepIndicator);
    item.classList.toggle("active", number === step);
    item.classList.toggle("complete", number < step);
  });
}

function validateStep(step) {
  const page = document.querySelector(`.wizard-page[data-step="${step}"]`);
  let valid = true;
  page.querySelectorAll("[required]").forEach((field) => {
    if (field.type === "file") return;
    const missing = field.type === "checkbox" ? !field.checked : !field.value.trim();
    field.classList.toggle("invalid", missing);
    const error = field.parentElement.querySelector(".field-error");
    if (error) error.textContent = missing ? "Wajib diisi sebelum melanjutkan." : "";
    if (missing) valid = false;
  });
  if (step === 2) {
    const questionFile = document.querySelector("#question-file").files[0];
    const manualQuestion = document.querySelector("#upload-question-text").value.trim();
    const explanation = document.querySelector("#upload-explanation").value.trim();
    const solutionFile = document.querySelector("#solution-file").files[0];
    if (currentUploadMode === "dokumen" && !questionFile) {
      showToast("Pilih dokumen PDF atau foto soal terlebih dahulu.");
      return false;
    }
    if (currentUploadMode === "manual" && !manualQuestion) {
      document.querySelector("#upload-question-text").classList.add("invalid");
      showToast("Teks soal wajib diisi untuk unggahan manual.");
      return false;
    }
    if (!explanation && !solutionFile) {
      document.querySelector("#upload-explanation").classList.add("invalid");
      showToast("Tambahkan pembahasan atau lampirkan PDF kunci jawaban.");
      return false;
    }
    const consent = document.querySelector("#upload-consent");
    if (!consent.checked) {
      consent.classList.add("invalid");
      showToast("Konfirmasikan hak berbagi dan pastikan bukan bocoran ujian aktif.");
      return false;
    }
  }
  if (!valid) {
    page.querySelector(".invalid")?.focus();
    showToast("Lengkapi semua informasi wajib terlebih dahulu.");
  }
  return valid;
}

function makeSubmissionPreview() {
  const faculty = facultyByCode(document.querySelector("#upload-faculty").value);
  const file = document.querySelector("#question-file").files[0];
  const solution = document.querySelector("#solution-file").files[0];
  const questionText = document.querySelector("#upload-question-text").value.trim();
  const explanation = document.querySelector("#upload-explanation").value.trim();
  document.querySelector("#submission-preview").innerHTML = `
    <div class="preview-label"><span>RINGKASAN ARSIP SOAL</span><span class="verified-badge">Siap ditinjau</span></div>
    <h3>${htmlEscape(document.querySelector("#upload-course").value)}</h3>
    <p>${htmlEscape(faculty.name)} · ${htmlEscape(document.querySelector("#upload-department").value)} · ${htmlEscape(document.querySelector("#upload-semester").value || "Semester belum dipilih")}</p>
    <p>${htmlEscape(document.querySelector("#upload-topic").value)} · ${htmlEscape(document.querySelector("#upload-exam-type").selectedOptions[0].textContent)} · ${htmlEscape(document.querySelector("#upload-year").value)}</p>
    <div class="preview-attachments"><span>Soal: <b>${htmlEscape(file?.name ?? "Teks soal manual")}</b></span><span>Pembahasan: <b>${htmlEscape(solution?.name ?? (explanation ? "Pembahasan tertulis" : "Belum dilampirkan"))}</b></span></div>
    ${questionText ? `<div class="preview-manual-text"><b>Pratinjau teks soal</b><p>${htmlEscape(questionText)}</p></div>` : ""}`;
}

document.querySelectorAll(".next-step").forEach((button) => button.addEventListener("click", () => {
  if (!validateStep(currentStep)) return;
  if (currentStep === 2) makeSubmissionPreview();
  setStep(currentStep + 1);
  document.querySelector(".upload-card").scrollIntoView({ behavior: "smooth", block: "start" });
}));
document.querySelectorAll(".previous-step").forEach((button) => button.addEventListener("click", () => setStep(currentStep - 1)));
document.querySelectorAll(".form-field select, .form-field textarea").forEach((field) => field.addEventListener("input", () => {
  field.classList.remove("invalid");
  const error = field.parentElement.querySelector(".field-error");
  if (error) error.textContent = "";
}));
document.querySelector("#upload-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (currentStep !== 3 || !validateStep(2)) return;
  document.querySelector("#upload-form").hidden = true;
  document.querySelector(".wizard-progress").hidden = true;
  document.querySelector("#submission-number").textContent = `SU-${String(Math.floor(1000 + Math.random() * 9000))}`;
  document.querySelector("#submission-success").hidden = false;
  document.querySelector(".moderation-timeline .timeline-item.active").classList.add("complete");
});

function resetUpload() {
  document.querySelector("#upload-form").reset();
  document.querySelector("#upload-form").hidden = false;
  document.querySelector(".wizard-progress").hidden = false;
  document.querySelector("#submission-success").hidden = true;
  document.querySelector("#upload-department").disabled = true;
  document.querySelector("#upload-course").disabled = true;
  clearFile("question");
  clearFile("solution");
  switchUploadMode("dokumen");
  setStep(1);
}

const initialView = window.location.hash.slice(1);
if (initialView === "jelajah" || initialView === "kontribusi") navigate(initialView);
renderPapers();
