// =========================================================
// 1. 서명 패드 모듈 (Signature Pad Module for sign.html)
// =========================================================

let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;

function initSignaturePad() {
    signatureCanvas = document.getElementById('signature-pad');
    if (!signatureCanvas) return;

    signatureCtx = signatureCanvas.getContext('2d');
    isDrawing = false;

    // 마우스 이벤트
    signatureCanvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        drawSignature(e);
    });
    signatureCanvas.addEventListener('mouseup', () => {
        isDrawing = false;
        signatureCtx.beginPath();
    });
    signatureCanvas.addEventListener('mouseout', () => {
        isDrawing = false;
        signatureCtx.beginPath();
    });
    signatureCanvas.addEventListener('mousemove', drawSignature);

    // 터치 이벤트
    signatureCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDrawing = true;
        const touch = e.touches[0];
        const rect = signatureCanvas.getBoundingClientRect();
        signatureCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    signatureCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const touch = e.touches[0];
        const rect = signatureCanvas.getBoundingClientRect();
        signatureCtx.lineWidth = 2;
        signatureCtx.lineCap = 'round';
        signatureCtx.strokeStyle = '#000';
        signatureCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        signatureCtx.stroke();
        signatureCtx.beginPath();
        signatureCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    signatureCanvas.addEventListener('touchend', () => {
        isDrawing = false;
        signatureCtx.beginPath();
    });
}

function drawSignature(e) {
    if (!isDrawing || !signatureCanvas || !signatureCtx) return;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    signatureCtx.strokeStyle = '#000';
    signatureCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    signatureCtx.stroke();
    signatureCtx.beginPath();
    signatureCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function clearPad() {
    if (!signatureCanvas || !signatureCtx) return;
    signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    signatureCtx.beginPath();
}

function submitSignature() {
    if (!signatureCanvas) return;
    const dataURL = signatureCanvas.toDataURL();
    fetch('/submit_signature', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'signature=' + encodeURIComponent(dataURL)
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        } else {
            return response.text().then(data => {
                alert(data);
            });
        }
    });
}


// =========================================================
// 2. 관리자 웹페이지 관리 모듈 (Admin Panel Live Preview)
// =========================================================

function escapePreview(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function updateLivePreview() {
    const organization = document.getElementById('organization_name')?.value || '';
    const year = document.getElementById('academic_year')?.value || '';
    const semester = document.getElementById('semester')?.value || '';
    const mainTitle = '동아리 재등록 시스템';
    const helpTitle = document.getElementById('help_title')?.value || '';
    const helpMessage = document.getElementById('help_message')?.value || '';
    const completionTitle = document.getElementById('completion_title')?.value || '';
    const completionMessage = document.getElementById('completion_message')?.value || '';
    const slogan = document.getElementById('slogan')?.value || '';

    const titleElement = document.getElementById('preview_title');
    const helpTitleElement = document.getElementById('preview_help_title');
    const helpMessageElement = document.getElementById('preview_help_message');
    const yearElement = document.getElementById('preview_year');
    const orgElement = document.getElementById('preview_org');
    const completionTitleElement = document.getElementById('preview_completion_title');
    const completionMessageElement = document.getElementById('preview_completion_message');
    const sloganElement = document.getElementById('preview_slogan');

    if (titleElement) titleElement.innerHTML = `${escapePreview(year)}년 ${escapePreview(semester)} '${escapePreview(organization)}'<br>${escapePreview(mainTitle)}`;
    if (helpTitleElement) helpTitleElement.textContent = helpTitle;
    if (helpMessageElement) helpMessageElement.textContent = helpMessage;
    if (yearElement) yearElement.textContent = year;
    if (orgElement) orgElement.textContent = organization;
    if (completionTitleElement) completionTitleElement.innerHTML = `${escapePreview(year)}학년도 ${escapePreview(semester)}<br>${escapePreview(organization)} ${escapePreview(completionTitle)}`;
    if (completionMessageElement) completionMessageElement.textContent = completionMessage;
    if (sloganElement) sloganElement.textContent = slogan;
}

function showPreviewScreen(screen) {
    const mainPage = document.getElementById('preview_main_page');
    const completePage = document.getElementById('preview_complete_page');
    const mainTab = document.getElementById('preview_tab_main');
    const completeTab = document.getElementById('preview_tab_complete');

    if (!mainPage || !completePage) return;

    if (screen === 'complete') {
        mainPage.style.display = 'none';
        completePage.style.display = 'block';
        if (mainTab) mainTab.classList.remove('active');
        if (completeTab) completeTab.classList.add('active');
    } else {
        mainPage.style.display = 'block';
        completePage.style.display = 'none';
        if (mainTab) mainTab.classList.add('active');
        if (completeTab) completeTab.classList.remove('active');
    }
}

function initAdminPanel() {
    const previewContainer = document.querySelector('.live-preview');
    if (!previewContainer) return;

    const fields = [
        'organization_name', 'academic_year', 'semester',
        'help_title', 'help_message',
        'completion_title', 'completion_message', 'slogan'
    ];

    fields.forEach(function (id) {
        const element = document.getElementById(id);
        if (element) element.addEventListener('input', updateLivePreview);
    });

    updateLivePreview();
}


// =========================================================
// 3. 관리자 회원 관리 모듈 (Admin Members Management)
// =========================================================

let currentSort = { field: null, direction: 'asc' };
let currentStatusFilter = 'all';

function getRows() {
    return Array.from(document.querySelectorAll('#member_tbody .member-row'));
}

function normalize(value) {
    return String(value || '').toLowerCase().replace(/[\-\s]/g, '');
}

function applyFilters() {
    const searchInput = document.getElementById('member_search');
    const statusSelect = document.getElementById('status_filter');
    const deptSelect = document.getElementById('department_filter');
    const gradeSelect = document.getElementById('grade_filter');

    if (!searchInput || !statusSelect || !deptSelect || !gradeSelect) return;

    const search = normalize(searchInput.value);
    const status = statusSelect.value;
    const department = deptSelect.value;
    const grade = gradeSelect.value;
    currentStatusFilter = status;
    let visible = 0;

    getRows().forEach(row => {
        const matchesSearch = !search ||
            normalize(row.dataset.name).includes(search) ||
            normalize(row.dataset.student).includes(search) ||
            normalize(row.dataset.phone).includes(search) ||
            normalize(row.dataset.department).includes(search);
        const matchesStatus = status === 'all' || row.dataset.signed === status;
        const matchesDepartment = department === 'all' || row.dataset.department === normalize(department);
        const matchesGrade = grade === 'all' || row.dataset.grade === grade;
        const show = matchesSearch && matchesStatus && matchesDepartment && matchesGrade;

        row.style.display = show ? '' : 'none';

        if (!show) {
            const checkbox = row.querySelector('.member-checkbox');
            if (checkbox) checkbox.checked = false;
            row.classList.remove('selected');
        }
        if (show) visible++;
    });

    const visibleCountEl = document.getElementById('visible_count');
    const noResultsEl = document.getElementById('no_results');
    const resultTextEl = document.getElementById('result_text');

    if (visibleCountEl) visibleCountEl.innerText = visible;
    if (noResultsEl) noResultsEl.style.display = visible === 0 ? 'block' : 'none';
    if (resultTextEl) {
        resultTextEl.innerText = (visible === getRows().length)
            ? '전체 회원을 표시하고 있습니다.'
            : `${visible}명의 회원을 표시하고 있습니다.`;
    }

    updateSelection();
    updateStatActive();
}

function setStatusFilter(status) {
    const statusFilter = document.getElementById('status_filter');
    if (statusFilter) statusFilter.value = status;
    currentStatusFilter = status;
    applyFilters();
}

function updateStatActive() {
    ['all', 'signed', 'pending'].forEach(type => {
        const el = document.getElementById(type === 'all' ? 'stat_all' : `stat_${type}`);
        if (el) el.classList.toggle('active', currentStatusFilter === type);
    });
}

function clearSearch() {
    const searchInput = document.getElementById('member_search');
    if (searchInput) {
        searchInput.value = '';
        applyFilters();
        searchInput.focus();
    }
}

function toggleSelectAll(source) {
    const checked = source.checked;
    getRows().forEach(row => {
        if (row.style.display === 'none') return;
        const checkbox = row.querySelector('.member-checkbox');
        if (checkbox) checkbox.checked = checked;
        row.classList.toggle('selected', checked);
    });
    const selectAll = document.getElementById('select_all');
    const headerSelectAll = document.getElementById('header_select_all');
    if (selectAll) selectAll.checked = checked;
    if (headerSelectAll) headerSelectAll.checked = checked;
    updateSelection();
}

function updateSelection() {
    const visibleRows = getRows().filter(row => row.style.display !== 'none');
    const selectedRows = getRows().filter(row => {
        const cb = row.querySelector('.member-checkbox');
        return cb && cb.checked;
    });

    getRows().forEach(row => {
        const cb = row.querySelector('.member-checkbox');
        row.classList.toggle('selected', cb ? cb.checked : false);
    });

    const selectedCount = selectedRows.length;
    const bulkToolbar = document.querySelector('.bulk-toolbar');
    if (bulkToolbar) bulkToolbar.classList.toggle('show', selectedCount > 0);

    const selectionText = document.getElementById('selection_text');
    if (selectionText) selectionText.innerText = `${selectedCount}명 선택`;

    const bulkStatusBtn = document.getElementById('bulk_status_button');
    const bulkSignBtn = document.getElementById('bulk_sign_button');
    const bulkDelBtn = document.getElementById('bulk_delete_button');

    if (bulkStatusBtn) bulkStatusBtn.disabled = selectedCount === 0;
    if (bulkSignBtn) bulkSignBtn.disabled = selectedCount === 0;
    if (bulkDelBtn) bulkDelBtn.disabled = selectedCount === 0;

    const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(row => {
        const cb = row.querySelector('.member-checkbox');
        return cb && cb.checked;
    });
    const selectAll = document.getElementById('select_all');
    const headerSelectAll = document.getElementById('header_select_all');
    if (selectAll) selectAll.checked = allVisibleSelected;
    if (headerSelectAll) headerSelectAll.checked = allVisibleSelected;
}

function getSelectedRows() {
    return getRows().filter(row => {
        const cb = row.querySelector('.member-checkbox');
        return cb && cb.checked;
    });
}

function showSelectedStatus() {
    const rows = getSelectedRows();
    if (!rows.length) { showToast('회원부터 선택해주세요.'); return; }
    const signed = rows.filter(row => row.dataset.signed === 'signed').length;
    const pending = rows.length - signed;
    alert(`선택한 회원 ${rows.length}명\n\n✓ 서명 완료: ${signed}명\n미서명: ${pending}명`);
}

function setSort(field) {
    let direction = 'asc';
    if (currentSort.field === field) direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    currentSort = { field, direction };
    const rows = getRows();

    rows.sort((a, b) => {
        let av, bv;
        if (field === 'name') { av = a.dataset.name; bv = b.dataset.name; } 
        else if (field === 'department') { av = a.dataset.department; bv = b.dataset.department; } 
        else { av = a.dataset.student; bv = b.dataset.student; }
        const result = av.localeCompare(bv, 'ko', { numeric: true, sensitivity: 'base' });
        return direction === 'asc' ? result : -result;
    });

    const tbody = document.getElementById('member_tbody');
    if (tbody) rows.forEach(row => tbody.appendChild(row));
    updateSortIndicators();
    applyFilters();
}

function sortMembers() {
    const sortFilter = document.getElementById('sort_filter');
    if (!sortFilter) return;
    const value = sortFilter.value;
    if (value === 'default') { location.reload(); return; }
    if (value === 'signed-desc') {
        const rows = getRows();
        rows.sort((a, b) => a.dataset.signed === b.dataset.signed ? 0 : a.dataset.signed === 'signed' ? -1 : 1);
        const tbody = document.getElementById('member_tbody');
        if (tbody) rows.forEach(row => tbody.appendChild(row));
        applyFilters();
        return;
    }

    const [field, direction] = value.split('-');
    const rows = getRows();
    rows.sort((a, b) => {
        let av, bv;
        if (field === 'name') { av = a.dataset.name; bv = b.dataset.name; } 
        else if (field === 'student') { av = a.dataset.student; bv = b.dataset.student; } 
        else { av = a.dataset.department; bv = b.dataset.department; }
        const result = av.localeCompare(bv, 'ko', { numeric: true, sensitivity: 'base' });
        return direction === 'asc' ? result : -result;
    });
    const tbody = document.getElementById('member_tbody');
    if (tbody) rows.forEach(row => tbody.appendChild(row));
    applyFilters();
}

function updateSortIndicators() {
    ['name', 'department', 'student'].forEach(field => {
        const el = document.getElementById(`sort_${field}`);
        if (!el) return;
        if (currentSort.field !== field) { el.innerText = '↕'; return; }
        el.innerText = currentSort.direction === 'asc' ? '↑' : '↓';
    });
}

async function deleteSelectedMembers() {
    const rows = getSelectedRows();
    if (!rows.length) { showToast('삭제할 회원을 선택해주세요.'); return; }
    const names = rows.map(row => row.dataset.displayName);
    if (!confirm(`선택한 ${rows.length}명의 회원을 삭제하시겠습니까?\n\n` + names.slice(0, 8).join(', ') + (names.length > 8 ? ` 외 ${names.length - 8}명` : ''))) return;

    try {
        for (const row of rows) {
            const response = await fetch(`/admin/delete_user/${row.dataset.id}`, { method: 'POST' });
            if (!response.ok) throw new Error(`${row.dataset.displayName} 삭제 실패`);
        }
        location.reload();
    } catch (error) {
        alert('일괄 삭제 중 문제가 발생했습니다.\n' + error.message);
    }
}

function exportExcel() {
    if (typeof XLSX === 'undefined') {
        showToast('엑셀 라이브러리를 불러오지 못했습니다.');
        return;
    }
    const rows = getRows().filter(row => row.style.display !== 'none');
    if (!rows.length) { showToast('내보낼 회원이 없습니다.'); return; }
    const data = [['이름', '학과', '학년', '학번', '전화번호', '서명 상태', '서명 일시']];
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        data.push([
            cells[1].innerText.trim(),
            cells[2].innerText.trim(),
            cells[3].innerText.trim(),
            cells[4].innerText.trim(),
            cells[5].innerText.trim(),
            row.dataset.signed === 'signed' ? '서명 완료' : '미서명',
            cells[7].innerText.trim()
        ]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '회원 목록');
    XLSX.writeFile(workbook, `뉴맨_회원목록_${getTodayString()}.xlsx`);
    showToast('엑셀 파일을 생성했습니다.');
}

async function exportSelectedSignatures() {
    if (typeof JSZip === 'undefined') {
        showToast('ZIP 라이브러리를 불러오지 못했습니다.');
        return;
    }
    const rows = getSelectedRows();
    if (!rows.length) { showToast('서명을 내보낼 회원을 선택해주세요.'); return; }
    const signedRows = rows.filter(row => row.dataset.signed === 'signed');
    if (!signedRows.length) { showToast('선택한 회원 중 서명 완료 회원이 없습니다.'); return; }
    if (!confirm(`선택한 회원 중 서명 완료 ${signedRows.length}명의 서명을 ZIP 파일로 내보내시겠습니까?`)) return;

    const zip = new JSZip();
    let success = 0;
    for (const row of signedRows) {
        try {
            const response = await fetch(row.dataset.signatureUrl);
            if (!response.ok) continue;
            const blob = await response.blob();
            const name = sanitizeFileName(row.dataset.displayName);
            zip.file(`${name}.png`, blob);
            success++;
        } catch (error) { console.error(error); }
    }
    if (!success) { showToast('서명 파일을 가져오지 못했습니다.'); return; }
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `뉴맨_서명파일_${getTodayString()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`${success}명의 서명 파일을 내보냈습니다.`);
}

function openSignatureModal(name, url, signedAt) {
    const nameEl = document.getElementById('modal_member_name');
    const signedAtEl = document.getElementById('modal_signed_at');
    const imgEl = document.getElementById('modal_signature_image');
    const dlEl = document.getElementById('modal_download');
    const modalEl = document.getElementById('signature_modal');

    if (nameEl) nameEl.innerText = name;
    if (signedAtEl) signedAtEl.innerText = signedAt;
    if (imgEl) imgEl.src = url;
    if (dlEl) dlEl.href = url;
    if (modalEl) modalEl.classList.add('show');
}

function closeSignatureModal(event) {
    const modalEl = document.getElementById('signature_modal');
    if (!modalEl) return;
    if (event && event.target !== modalEl) return;
    modalEl.classList.remove('show');
    const imgEl = document.getElementById('modal_signature_image');
    if (imgEl) imgEl.src = '';
}

function validateMemberForm() {
    const phone = document.getElementById('phone')?.value || '';
    const last4 = document.getElementById('phone_last4')?.value || '';
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length !== 10 && digits.length !== 11) {
        alert('전화번호를 올바르게 입력해주세요.');
        document.getElementById('phone')?.focus();
        return false;
    }
    const cleanLast4 = last4.replace(/[^0-9]/g, '');
    if (cleanLast4.length !== 4) {
        alert('전화번호 뒷자리 4자리를 입력해주세요.');
        document.getElementById('phone_last4')?.focus();
        return false;
    }
    return true;
}

function formatPhone(value) {
    let digits = value.replace(/[^0-9]/g, '');
    if (digits.length > 11) digits = digits.substring(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.substring(0, 3) + '-' + digits.substring(3);
    return digits.substring(0, 3) + '-' + digits.substring(3, 7) + '-' + digits.substring(7);
}

function editUser(userId, name, department, grade, studentId, phone, phoneLast4) {
    const nameEl = document.getElementById('name');
    const deptEl = document.getElementById('department');
    const gradeEl = document.getElementById('grade');
    const studentIdEl = document.getElementById('student_id');
    const phoneEl = document.getElementById('phone');
    const phoneLast4El = document.getElementById('phone_last4');

    if (nameEl) nameEl.value = name;
    if (deptEl) deptEl.value = department;
    if (gradeEl) gradeEl.value = grade;
    if (studentIdEl) studentIdEl.value = studentId;
    if (phoneEl) phoneEl.value = phone;
    if (phoneLast4El) phoneLast4El.value = phoneLast4;

    const form = document.getElementById('user_form');
    if (!form) return;
    form.action = '/admin/update_user';
    
    const submitBtn = document.getElementById('submit_button');
    const cancelBtn = document.getElementById('cancel_button');
    const formTitle = document.getElementById('form_title');

    if (submitBtn) submitBtn.innerText = '회원 정보 수정 완료';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    if (formTitle) formTitle.innerText = '회원 정보 수정';

    const oldId = form.querySelector('input[name="id"]');
    if (oldId) oldId.remove();
    const hiddenId = document.createElement('input');
    hiddenId.type = 'hidden';
    hiddenId.name = 'id';
    hiddenId.value = userId;
    form.appendChild(hiddenId);
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEdit() {
    const form = document.getElementById('user_form');
    if (!form) return;
    form.reset();
    form.action = '/admin/add_user';
    
    const submitBtn = document.getElementById('submit_button');
    const cancelBtn = document.getElementById('cancel_button');
    const formTitle = document.getElementById('form_title');

    if (submitBtn) submitBtn.innerText = '신규 회원 추가';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (formTitle) formTitle.innerText = '신규 회원 추가';
    const hiddenId = form.querySelector('input[name="id"]');
    if (hiddenId) hiddenId.remove();
}

function sanitizeFileName(name) {
    return name.replace(/[\\\\/:*?"<>|]/g, '_').trim() || 'signature';
}

function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 2200);
}

function initAdminMembers() {
    const memberTable = document.getElementById('member_table');
    if (!memberTable) return;

    const search = document.getElementById('member_search');
    const phone = document.getElementById('phone');
    const last4 = document.getElementById('phone_last4');

    if (search) search.addEventListener('input', applyFilters);
    if (phone) phone.addEventListener('input', function (event) { event.target.value = formatPhone(event.target.value); });
    if (last4) last4.addEventListener('input', function (event) { event.target.value = event.target.value.replace(/[^0-9]/g, '').substring(0, 4); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeSignatureModal(); });

    const rows = getRows();
    const total = rows.length;
    const signed = rows.filter(row => row.dataset.signed === 'signed').length;
    const pending = total - signed;
    
    const statTotal = document.getElementById('stat_total');
    const statSigned = document.getElementById('stat_signed_value');
    const statPending = document.getElementById('stat_pending_value');

    if (statTotal) statTotal.innerText = total;
    if (statSigned) statSigned.innerText = signed;
    if (statPending) statPending.innerText = pending;

    applyFilters();
}


// =========================================================
// 4. 전역 초기화 (DOM Content Loaded)
// =========================================================

document.addEventListener('DOMContentLoaded', function () {
    initSignaturePad();
    initAdminPanel();
    initAdminMembers();
});

