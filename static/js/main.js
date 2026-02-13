let currentFile = null;
let currentPage = 1;
let totalPages = 1;

// State Management
const STATES = {
    UPLOAD: 'uploadState',
    ACTION_SELECT: 'actionSelectState',
    EDITOR: 'editorState',
    PDF_STUDIO: 'pdfStudioState',
    DOCX_EDITOR: 'docxEditorState',
    DOCX_ORGANIZE: 'docxOrganizeState',
    RESULT: 'resultState'
};

const TOOLS = {
    csv: [
        { id: 'editor', icon: '📝', title: 'Edit Data', desc: 'View spreadsheet & edit cells', action: 'openEditor()' },
        { id: 'split', icon: '✂️', title: 'Split', desc: 'Divide into smaller files', action: "showTool('splitSection')" },
        { id: 'filter', icon: '🔍', title: 'Filter', desc: 'Filter rows by condition', action: "showTool('filterSection')" },
        { id: 'date', icon: '📅', title: 'Date', desc: 'Remove by date range', action: "showTool('dateFilterSection')" },
        { id: 'ai', icon: '✨', title: 'AI Clean', desc: 'Auto-fix & analyze', action: "showTool('aiSection')" }
    ],
    pdf: [
        { id: 'split', icon: '✂️', title: 'Split Pages', desc: 'Extract pages to new PDF', action: "showTool('splitSection')" },
        { id: 'merge', icon: '➕', title: 'Merge PDF', desc: 'Combine with another PDF', action: "startPdfMerge()" },
        { id: 'edit', icon: '📝', title: 'Edit PDF', desc: 'Rotate, Delete, Reorder', action: "openPdfStudio()" }
    ],
    docx: [
        { id: 'editor', icon: '📝', title: 'DOCX Editor', desc: 'Preview, Edit text & Add images', action: "openDocxEditor()" },
        { id: 'organize', icon: '📄', title: 'Manage Pages', desc: 'Merge, Split, Reorder', action: "openDocxOrganize()" },
        { id: 'findReplace', icon: '🔎', title: 'Find & Replace', desc: 'Replace text content', action: "showTool('findReplaceSection')" }
    ],
    pptx: [
        { id: 'findReplace', icon: '🔎', title: 'Find & Replace', desc: 'Replace text content', action: "showTool('findReplaceSection')" }
    ]
};

document.addEventListener('DOMContentLoaded', function () {
    setupFileUpload();

    // Initialize view
    switchState(STATES.UPLOAD);

    // Tool close buttons
    document.querySelectorAll('.btn-close-tool').forEach(btn => {
        btn.addEventListener('click', hideTools);
    });
});

function renderTools(fileType) {
    const grid = document.getElementById('toolsGrid');
    grid.innerHTML = '';

    // Normalize fileType if needed or default to empty
    let tools = TOOLS[fileType] || [];

    // Fallback for generic logic if needed
    if (fileType === 'doc') tools = TOOLS['docx'];
    if (fileType === 'ppt') tools = TOOLS['pptx'];

    if (tools.length === 0) {
        grid.innerHTML = '<p class="text-muted">No tools available for this file type.</p>';
        return;
    }

    tools.forEach(tool => {
        const btn = document.createElement('button');
        btn.className = 'tool-card glass-button';
        btn.onclick = () => eval(tool.action); // simple eval for string action, can normally be function ref
        btn.innerHTML = `
            <div class="tool-icon">${tool.icon}</div>
            <h3>${tool.title}</h3>
            <p>${tool.desc}</p>
        `;
        grid.appendChild(btn);
    });
}


function switchState(stateId) {
    // Hide all states
    Object.values(STATES).forEach(id => {
        document.getElementById(id).style.display = 'none';
    });

    // Show target state
    const stateEl = document.getElementById(stateId);
    if (stateEl) {
        stateEl.style.display = 'block';
        stateEl.scrollIntoView({ behavior: 'smooth' });
    }
}

function resetToUpload() {
    currentFile = null;
    document.getElementById('fileInput').value = '';
    hideTools();
    switchState(STATES.UPLOAD);
}

// File Upload
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFileUpload(files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
    });
}

function handleFileUpload(files) {
    const formData = new FormData();
    // Only take the first file for now in this workflow, or handle multiple if needed
    if (files.length > 0) {
        formData.append('files', files[0]);
    } else {
        return; // invalid file
    }

    if (formData.has('files')) {
        // Show loading state if we had a spinner, but for now just wait
        fetch('/api/upload/', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.files && data.files.length > 0) {
                    // Set current file and switch state
                    currentFile = data.files[0];
                    updateFileSummary(currentFile);
                    renderTools(currentFile.file_type); // Render appropriate tools
                    switchState(STATES.ACTION_SELECT);
                } else {
                    alert('Error uploading files: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error uploading files');
            });
    }
}

// ... (existing code) ...

// 5. Find & Replace
function applyFindReplace() {
    const findText = document.getElementById('findText').value;
    const replaceText = document.getElementById('replaceText').value;
    const outputName = document.getElementById('findReplaceOutputName').value || 'modified_doc';

    if (!findText) { alert('Find text is required'); return; }

    fetch(`/api/files/${currentFile.id}/find-replace/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            find_text: findText,
            replace_text: replaceText,
            output_name: outputName
        })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showResult(`Replaced text successfully. Created ${data.file.name}`, data.file.id);
            } else {
                alert('Error: ' + data.error);
            }
        });
}

function updateFileSummary(file) {
    document.getElementById('currentFileName').textContent = file.name;
    document.getElementById('currentFileStats').textContent =
        `${file.row_count} rows | ${file.column_count} columns | ${formatFileSize(file.size)}`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Tool Handling
function hideTools() {
    document.querySelectorAll('.tool-panel').forEach(el => el.style.display = 'none');
}

function showTool(toolId) {
    hideTools();
    const toolEl = document.getElementById(toolId);
    if (toolEl) {
        toolEl.style.display = 'block';
        // Pre-fill selects if needed (though we only have one file now)
        initializeTool(toolId);
        // Scroll to tool
        document.getElementById('activeToolContainer').scrollIntoView({ behavior: 'smooth' });
    }
}

function initializeTool(toolId) {
    // Since we only work on currentFile, we don't need file selects anymore.
    // But we might need to load columns.
    if (!currentFile) return;

    if (toolId === 'filterSection') {
        loadColumnsForSelect(document.querySelector('#filterSection .filter-column'), currentFile.id);
        // Clear previous conditions
        document.getElementById('filterConditions').innerHTML = '';
        addFilterCondition(); // Add one empty condition
    } else if (toolId === 'dateFilterSection') {
        loadColumnsForSelect(document.getElementById('dateFilterColumn'), currentFile.id);
    } else if (toolId === 'splitSection') {
        // Reset split fields
    }
}

function loadColumnsForSelect(selectElement, fileId) {
    fetch(`/api/files/${fileId}/`)
        .then(response => response.json())
        .then(data => {
            const columns = data.columns;
            const options = '<option value="">Select column</option>' +
                columns.map(col => `<option value="${col}">${col}</option>`).join('');

            if (selectElement) selectElement.innerHTML = options;

            // If this is for filter conditions, we might need to update all existing selects
            if (selectElement.classList.contains('filter-column')) {
                // Helper to update specific select, handled by caller mostly
            }
        })
        .catch(error => console.error('Error loading columns:', error));
}


// Editor State
function openEditor() {
    if (!currentFile) return;

    switchState(STATES.EDITOR);
    currentPage = 1;
    loadEditorData(1);
    document.getElementById('editorFileName').textContent = currentFile.name;
}

function showActionSelect() {
    switchState(STATES.ACTION_SELECT);
}

function loadEditorData(page) {
    fetch(`/api/files/${currentFile.id}/data/?page=${page}&page_size=100`)
        .then(response => response.json())
        .then(data => {
            currentPage = data.current_page;
            totalPages = data.total_pages;
            displayTable(data.data, data.columns);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading file data');
        });
}

function displayTable(data, columns) {
    const editorContent = document.getElementById('editorContent');

    let html = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map((row, rowIndex) => `
                        <tr>
                            ${columns.map(col => `
                                <td class="editable-cell" 
                                    data-row="${(currentPage - 1) * 100 + rowIndex}"
                                    data-col="${col}"
                                    onclick="editCell(this)">
                                    ${row[col] !== null && row[col] !== undefined ? row[col] : ''}
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="pagination">
            <button class="btn btn-secondary btn-sm" ${currentPage === 1 ? 'disabled' : ''} 
                    onclick="changePage(${currentPage - 1})">Previous</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button class="btn btn-secondary btn-sm" ${currentPage === totalPages ? 'disabled' : ''} 
                    onclick="changePage(${currentPage + 1})">Next</button>
        </div>
    `;

    editorContent.innerHTML = html;
}

function changePage(page) {
    if (page < 1 || page > totalPages) return;
    loadEditorData(page);
}

function editCell(cell) {
    const currentValue = cell.textContent.trim();
    const rowIndex = parseInt(cell.dataset.row);
    const column = cell.dataset.col;

    cell.classList.add('editing');
    cell.contentEditable = true;
    cell.focus();

    const saveEdit = () => {
        const newValue = cell.textContent.trim();
        cell.contentEditable = false;
        cell.classList.remove('editing');

        if (newValue !== currentValue) {
            fetch(`/api/files/${currentFile.id}/edit/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    row_index: rowIndex,
                    column: column,
                    value: newValue
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        cell.textContent = newValue;
                    } else {
                        alert('Error saving: ' + (data.error || 'Unknown error'));
                        cell.textContent = currentValue;
                    }
                });
        }
    };

    cell.addEventListener('blur', saveEdit, { once: true });
    cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); cell.blur(); }
        else if (e.key === 'Escape') {
            cell.textContent = currentValue;
            cell.contentEditable = false;
            cell.classList.remove('editing');
        }
    }, { once: true });
}


// Result State
function showResult(message, fileId, isEdit = false) {
    switchState(STATES.RESULT);
    document.getElementById('resultMessage').textContent = message;

    const downloadBtn = document.getElementById('resultDownloadBtn');
    const downloadNote = document.getElementById('downloadNote');

    if (fileId) {
        downloadBtn.style.display = 'inline-flex';
        downloadBtn.onclick = () => window.open(`/api/files/${fileId}/download/`, '_blank');

        // Show initial note
        if (downloadNote) {
            downloadNote.style.display = 'block';
            downloadNote.innerHTML = 'Download starting in 5 seconds...<br>If not triggered in 15 seconds, please click the button above.';
        }

        // Auto Download Trigger (5 seconds)
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = `/api/files/${fileId}/download/`;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, 5000);

        // Update note after 15 seconds (optional enhancement)
        setTimeout(() => {
            if (downloadNote) {
                downloadNote.innerHTML = 'If download did not start automatically, please use the <strong>Download File</strong> button above.';
            }
        }, 15000);

    } else {
        downloadBtn.style.display = 'none';
        if (downloadNote) downloadNote.style.display = 'none';
    }
}


// Tool Actions

// 1. Split
function splitFile() {
    const splitType = document.getElementById('splitType').value;
    const splitValue = document.getElementById('splitValue').value;
    const outputPrefix = document.getElementById('splitOutputPrefix').value || 'split_file';

    if (!splitValue) { alert('Please fill all required fields'); return; }

    fetch(`/api/files/${currentFile.id}/split/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            split_type: splitType,
            split_value: splitValue,
            output_prefix: outputPrefix
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let msg = `Split into ${data.count} files successfully!`;
                let fileId = null;

                // If we have files, allow downloading the first one at least
                // In a real app we might zip them or list them all
                if (data.files && data.files.length > 0) {
                    fileId = data.files[0].id;
                    if (data.files.length > 1) {
                        msg += " (Downloading first part)";
                    }
                }

                showResult(msg, fileId);
            } else {
                alert('Error: ' + data.error);
            }
        });
}

// 2. Filter
function addFilterCondition() {
    const container = document.getElementById('filterConditions');
    const conditionDiv = document.createElement('div');
    conditionDiv.className = 'filter-condition';

    // We need columns loaded
    fetch(`/api/files/${currentFile.id}/`)
        .then(r => r.json())
        .then(data => {
            const columns = data.columns;
            conditionDiv.innerHTML = `
                <select class="filter-column form-control">
                    <option value="">Select column</option>
                    ${columns.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
                <select class="filter-operator form-control" onchange="updateFilterInputType(this)">
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater">></option>
                    <option value="less"><</option>
                    <option value="not_null">Not Null</option>
                    <option value="is_null">Is Null</option>
                </select>
                <input type="text" class="filter-value form-control" placeholder="Value">
                <button class="btn-icon-danger" onclick="this.parentElement.remove()">×</button>
            `;
            container.appendChild(conditionDiv);
        });
}

function updateFilterInputType(select) {
    const valInput = select.parentElement.querySelector('.filter-value');
    if (['not_null', 'is_null'].includes(select.value)) {
        valInput.style.display = 'none';
    } else {
        valInput.style.display = 'block';
    }
}

function filterFile() {
    const outputName = document.getElementById('filterOutputName').value || 'filtered.csv';
    const conditions = Array.from(document.querySelectorAll('.filter-condition')).map(el => ({
        column: el.querySelector('.filter-column').value,
        operator: el.querySelector('.filter-operator').value,
        value: el.querySelector('.filter-value').value
    })).filter(c => c.column && c.operator);

    if (conditions.length === 0) { alert('Add at least one condition'); return; }

    fetch(`/api/files/${currentFile.id}/filter/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: conditions, output_name: outputName })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showResult(`Filtered ${data.original_rows} rows down to ${data.filtered_rows} rows. Created ${data.file.name}`, data.file.id);
            } else {
                alert('Error: ' + data.error);
            }
        });
}

// 3. Date Filter
function updateDateFilterInputs() {
    const mode = document.getElementById('dateFilterMode').value;

    document.getElementById('dateInputSingle').style.display = mode === 'single' ? 'block' : 'none';
    document.getElementById('dateInputRange').style.display = mode === 'range' ? 'grid' : 'none';
    document.getElementById('dateInputMultiple').style.display = mode === 'multiple' ? 'block' : 'none';
}

function applyDateFilter() {
    const column = document.getElementById('dateFilterColumn').value;
    const mode = document.getElementById('dateFilterMode').value;
    const outputName = document.getElementById('dateFilterOutputName').value || 'date_filtered.csv';

    if (!column) { alert('Select column'); return; }

    let operator, value;

    if (mode === 'single') {
        operator = 'date_remove';
        value = document.getElementById('dateFilterValue').value;
        if (!value) { alert('Select a date'); return; }
    } else if (mode === 'range') {
        operator = 'date_range_remove';
        const start = document.getElementById('dateFilterStart').value;
        const end = document.getElementById('dateFilterEnd').value;
        if (!start || !end) { alert('Select start and end dates'); return; }
        value = `${start},${end}`;
    } else if (mode === 'multiple') {
        operator = 'date_list_remove';
        value = document.getElementById('dateFilterList').value;
        if (!value) { alert('Enter dates'); return; }
    }

    fetch(`/api/files/${currentFile.id}/filter/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filters: [{ column, operator, value }],
            output_name: outputName
        })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showResult(`Filter Complete. Remaining rows: ${data.filtered_rows}`, data.file.id);
            } else {
                alert('Error: ' + data.error);
            }
        });
}

// 4. AI
function aiPreprocess() {
    const action = document.getElementById('aiAction').value;
    const resultsDiv = document.getElementById('aiResults');
    resultsDiv.innerHTML = '<div class="loading">Analyzing...</div>';

    fetch(`/api/files/${currentFile.id}/ai-preprocess/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: action, auto_fix: action === 'clean' })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                if (data.file) {
                    // Cleaned file created
                    showResult(`AI Clean complete. Fixed issues and created ${data.file.name}`, data.file.id);
                } else {
                    // Just analysis
                    let html = '';
                    if (data.suggestions.length > 0) {
                        data.suggestions.forEach(s => {
                            html += `<div class="suggestion-item warning">
                            <strong>${s.type}</strong>: ${s.suggestion}
                        </div>`;
                        });
                    } else {
                        html = '<div class="suggestion-item success">No issues found!</div>';
                    }
                    resultsDiv.innerHTML = html;
                }
            } else {
                resultsDiv.innerHTML = `<div class="suggestion-item error">${data.error}</div>`;
            }
        });
}

// 6. PDF Studio
let pdfDoc = null;
let currentPages = []; // { index: 0, rotate: 0, deleted: false }

function openPdfStudio() {
    if (!currentFile || currentFile.file_type !== 'pdf') return;

    switchState(STATES.PDF_STUDIO || 'pdfStudioState'); // Add to STATES if not present
    document.getElementById('pdfFileName').textContent = currentFile.name;

    // Load PDF
    const url = `/api/files/${currentFile.id}/data/`; // We need a direct file URL actually
    // For now we can use the download URL if it serves inline, or a new preview endpoint
    // Let's assume /api/files/ID/download/ works for reading

    const loadingTask = pdfjsLib.getDocument(`/api/files/${currentFile.id}/download/`);
    loadingTask.promise.then(function (pdf) {
        pdfDoc = pdf;
        currentPages = Array.from({ length: pdf.numPages }, (_, i) => ({ index: i + 1, rotate: 0, deleted: false }));
        renderPdfGrid();
    }, function (reason) {
        console.error(reason);
        alert('Error loading PDF: ' + reason);
    });
}



function renderPdfGrid() {
    const grid = document.getElementById('pdfGrid');

    // Save current scroll position if grid exists
    const scrollPos = grid.scrollTop;

    grid.innerHTML = '';

    currentPages.forEach((pageConfig, i) => {
        if (pageConfig.deleted) return;

        const card = document.createElement('div');
        card.className = 'pdf-page-card';
        card.dataset.index = i;
        card.dataset.id = pageConfig.index;

        card.onclick = (e) => togglePageSelection(e, i);

        // Canvas for thumbnail
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'page-thumbnail';
        const canvas = document.createElement('canvas');
        canvasContainer.appendChild(canvas);

        // Page Number config
        const pageNum = document.createElement('div');
        pageNum.className = 'page-number';
        pageNum.innerText = `Pg ${pageConfig.index}`;

        // Rotation indicator
        if (pageConfig.rotate !== 0) {
            const rot = document.createElement('div');
            rot.className = 'page-rotation-badge';
            rot.innerText = `${pageConfig.rotate}°`;
            card.appendChild(rot);
        }

        card.appendChild(canvasContainer);
        card.appendChild(pageNum);
        grid.appendChild(card);

        // Render Page
        pdfDoc.getPage(pageConfig.index).then(function (page) {
            const viewport = page.getViewport({ scale: 0.3, rotation: pageConfig.rotate });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
            };
            page.render(renderContext);
        });
    });

    // Initialize Sortable if not already done

}

function togglePageSelection(e, listIndex) {
    // If holding shift/ctrl is not supported yet, let's just do single select for move simplicity or keep multi select
    // For manual move, single select is easier to understand: "Move page X to Y"

    // Clear other selections if we want single select for move? 
    // Let's keep multi-select for delete/rotate, but for move, maybe just take the first selected one or active one.

    const card = document.querySelector(`.pdf-page-card[data-index="${listIndex}"]`);
    if (card) {
        card.classList.toggle('selected');

        // Update Move Input with current index + 1
        const input = document.getElementById('movePageInput');
        if (input && card.classList.contains('selected')) {
            // Find the visual page number (index + 1)
            // But wait, listIndex is the index in currentPages. 
            // If we have deleted pages, the visual number might differ? 
            // "Pg X" on card is original index.
            // The "Target Position" implies the order in the grid.

            // Let's count how many non-deleted pages are before this one to get current visual position
            const visualIndex = currentPages.slice(0, listIndex).filter(p => !p.deleted).length + 1;
            // input.value = visualIndex; // Actually we want to enter TARGET, not current.
            input.placeholder = `Current: ${visualIndex}`;
        }
    }
}

function rotateSelected(deg) {
    const selected = document.querySelectorAll('.pdf-page-card.selected');
    if (selected.length === 0) return alert('Select pages first');

    selected.forEach(card => {
        const idx = parseInt(card.dataset.index);
        currentPages[idx].rotate = (currentPages[idx].rotate + deg) % 360;
    });
    renderPdfGrid();
}

function deleteSelectedPages() {
    const selected = document.querySelectorAll('.pdf-page-card.selected');
    if (selected.length === 0) return alert('Select pages first');

    if (!confirm(`Delete ${selected.length} pages?`)) return;

    selected.forEach(card => {
        const idx = parseInt(card.dataset.index);
        currentPages[idx].deleted = true;
    });
    renderPdfGrid();
}

function savePdfChanges() {
    // Construct page config for backend
    // Valid pages only
    const validPages = currentPages.filter(p => !p.deleted).map(p => ({
        original_page_number: p.index, // 1-based
        rotate: p.rotate
    }));

    if (validPages.length === 0) return alert('Cannot save empty PDF');

    fetch(`/api/files/${currentFile.id}/organize-pdf/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pages: validPages,
            output_name: `organized_${currentFile.name}`
        })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showResult(`PDF Saved! Created ${data.file.name}`, data.file.id);
            } else {
                alert('Error: ' + data.error);
            }
        });
}

function moveSelectedPage() {
    const selected = document.querySelectorAll('.pdf-page-card.selected');
    if (selected.length !== 1) return alert('Please select exactly one page to move.');

    const targetInput = document.getElementById('movePageInput');
    const targetPos = parseInt(targetInput.value);

    if (!targetPos || targetPos < 1) return alert('Please enter a valid target position.');

    // Get current visual list of non-deleted pages
    const validPages = currentPages.map((p, i) => ({ ...p, originalArrayIndex: i })).filter(p => !p.deleted);

    if (targetPos > validPages.length) return alert(`Target position must be between 1 and ${validPages.length}`);

    const card = selected[0];
    const originalArrayIndex = parseInt(card.dataset.index);

    // Find where this page is in the validPages list
    const currentVisualIndex = validPages.findIndex(p => p.originalArrayIndex === originalArrayIndex);

    if (currentVisualIndex === -1) return; // Should not happen

    // Calculate new index in validPages
    const newVisualIndex = targetPos - 1;

    if (currentVisualIndex === newVisualIndex) return; // No change

    // Remove from validPages
    const itemToMove = validPages.splice(currentVisualIndex, 1)[0];
    // Insert at new position
    validPages.splice(newVisualIndex, 0, itemToMove);

    // Reconstruct currentPages
    // We need to keep deleted pages where they are? Or just append them?
    const deletedPages = currentPages.filter(p => p.deleted);

    currentPages = [
        ...validPages.map(p => ({ index: p.index, rotate: p.rotate, deleted: false })),
        ...deletedPages
    ];

    renderPdfGrid();

    // Restore selection?
    // The index has changed, so dataset.index will change.
    // We can rely on renderPdfGrid re-rendering.
    targetInput.value = '';
}

// 7. PDF Merge
function startPdfMerge() {
    document.getElementById('mergeFileInput').click();
}

document.getElementById('mergeFileInput').addEventListener('change', function (e) {
    if (this.files.length === 0) return;

    const file = this.files[0];
    const formData = new FormData();
    formData.append('files', file); // Use 'files' key as expected by upload endpoint

    // Show some loading...
    const btn = document.querySelector('.pdf-studio-section .editor-toolbar .editor-actions button[onclick="startPdfMerge()"]');
    let originalText = '➕ Merge PDF';

    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Uploading...';
        btn.disabled = true;
    }

    // 1. Upload the second file
    fetch('/api/upload/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken') // Ensure CSRF token is sent if needed
        },
        body: formData
    })
        .then(r => r.json())
        .then(data => {
            if (data.files && data.files.length > 0) {
                const newFile = data.files[0];
                if (btn) btn.innerHTML = '✨ Merging...';

                // 2. Call Merge Endpoint
                return fetch('/api/merge/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_ids: [currentFile.id, newFile.id],
                        output_name: `merged_${currentFile.name}`
                    })
                });
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showResult(`Merged successfully! Created ${data.file.name}`, data.file.id);
            } else {
                alert('Merge Error: ' + data.error);
            }
        })
        .catch(err => {
            alert('Error: ' + err.message);
        })
        .finally(() => {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
            document.getElementById('mergeFileInput').value = '';
        });
});

// Helper for CSRF
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// 8. DOCX Editor Functions
function openDocxEditor() {
    switchState(STATES.DOCX_EDITOR);
    document.getElementById('docxFileName').innerText = currentFile.name;
    renderDocxEditor();
}

function renderDocxEditor() {
    const previewContainer = document.getElementById('docxPreview');
    const editContainer = document.getElementById('docxEditContainer');
    const btn = document.getElementById('docxEditToggleBtn');

    // Reset view to preview mode
    previewContainer.style.display = 'block';
    editContainer.style.display = 'none';
    btn.innerText = '📝 Edit Text';
    btn.classList.replace('btn-primary', 'btn-secondary');

    previewContainer.innerHTML = '<div class="text-center text-muted">Loading preview...</div>';

    fetch(`/api/files/${currentFile.id}/docx-content/`)
        .then(r => r.json())
        .then(data => {
            if (data.error) {
                previewContainer.innerHTML = `<div class="text-danger">Error: ${data.error}</div>`;
                return;
            }
            // HTML for Preview
            previewContainer.innerHTML = data.html || '<div class="text-muted">No content</div>';

            // Form for Editing
            editContainer.innerHTML = '';
            if (data.paragraphs) {
                data.paragraphs.forEach(p => {
                    const group = document.createElement('div');
                    group.className = 'mb-3 glass-card';
                    group.style.padding = '1rem';
                    group.innerHTML = `
                         <label class="form-label text-muted" style="font-size: 0.8rem">Paragraph ${p.id + 1}</label>
                         <textarea class="form-control" id="para_${p.id}" rows="3" style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem;">${p.text}</textarea>
                         <div style="text-align: right;">
                            <button class="btn btn-primary btn-sm" onclick="saveDocxParagraph(${p.id})">Save</button>
                         </div>
                    `;
                    editContainer.appendChild(group);
                });
            }
        })
        .catch(err => {
            previewContainer.innerHTML = `<div class="text-danger">Error loading document: ${err}</div>`;
        });
}

function toggleDocxEditMode() {
    const preview = document.getElementById('docxPreview');
    const edit = document.getElementById('docxEditContainer');
    const btn = document.getElementById('docxEditToggleBtn');

    if (preview.style.display !== 'none') {
        // Switch to Edit
        preview.style.display = 'none';
        edit.style.display = 'block';
        btn.innerText = '👁 Preview';
        btn.classList.replace('btn-secondary', 'btn-primary');
    } else {
        // Switch to Preview
        preview.style.display = 'block';
        edit.style.display = 'none';
        btn.innerText = '📝 Edit Text';
        btn.classList.replace('btn-primary', 'btn-secondary');
        // Reload preview to see changes
        renderDocxEditor();
    }
}

function saveDocxParagraph(index) {
    const text = document.getElementById(`para_${index}`).value;

    fetch('/api/files/' + currentFile.id + '/update-docx-text/', {
        method: 'POST',
        body: JSON.stringify({ index: index, text: text })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const btn = document.querySelector(`button[onclick="saveDocxParagraph(${index})"]`);
                const orig = btn.innerText;
                btn.innerText = 'Saved!';
                btn.style.backgroundColor = '#10b981';
                setTimeout(() => {
                    btn.innerText = orig;
                    btn.style.backgroundColor = '';
                }, 1000);
            } else {
                alert('Error: ' + data.error);
            }
        });
}

function triggerDocxImageUpload() {
    document.getElementById('docxImageInput').click();
}

document.getElementById('docxImageInput').addEventListener('change', function () {
    if (this.files.length === 0) return;
    uploadDocxImage(this.files[0]);
});

function uploadDocxImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    // Show loading
    const oldText = document.querySelector('button[onclick="triggerDocxImageUpload()"]').innerText;
    document.querySelector('button[onclick="triggerDocxImageUpload()"]').innerText = 'Uploading...';

    fetch(`/api/files/${currentFile.id}/upload-docx-image/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert('Image added to the end of document!');
                document.getElementById('docxImageInput').value = '';
                renderDocxEditor(); // Reload
            } else {
                alert('Error: ' + data.error);
            }
        })
        .finally(() => {
            document.querySelector('button[onclick="triggerDocxImageUpload()"]').innerText = oldText;
        });
}

// 9. DOCX Organize Functions
let docxPages = []; // [{index: 1, original: 1, deleted: false}]

function openDocxOrganize() {
    switchState(STATES.DOCX_ORGANIZE);
    document.getElementById('docxOrgFileName').innerText = currentFile.name;
    
    const grid = document.getElementById('docxGrid');
    grid.innerHTML = '<div class="text-center text-muted">Loading page structure...</div>';
    
    fetch(`/api/files/${currentFile.id}/docx-content/`)
        .then(r => r.json())
        .then(data => {
             // Default to 1 page for now until better page detection
             docxPages = Array.from({length: 1}, (_, i) => ({index: i+1, original: i+1, deleted: false}));
             renderDocxGrid(); 
        });
}

function renderDocxGrid() {
    const grid = document.getElementById('docxGrid');
    grid.innerHTML = '';
    
    docxPages.forEach((page, visualIndex) => {
        if (page.deleted) return;
        
        const card = document.createElement('div');
        card.className = 'pdf-page-card glass-card'; // Reuse PDF styles
        card.onclick = (e) => toggleDocxPageSelection(e, visualIndex);
        
        // No preview image, just text
        card.innerHTML = `
            <div class="page-preview" style="display:flex; align-items:center; justify-content:center; background:#fff;">
                <span style="font-size: 2rem; color: #ccc;">📄</span>
                <div style="position:absolute; bottom:5px; right:5px; font-weight:bold;">${page.index}</div>
            </div>
            <div class="page-number">Orig: ${page.original}</div>
        `;
        
        if (visualIndex === selectedDocxPageIdx) {
            card.classList.add('selected');
        }
        
        grid.appendChild(card);
    });
}

let selectedDocxPageIdx = -1;

function toggleDocxPageSelection(e, idx) {
    const cards = document.querySelectorAll('#docxGrid .pdf-page-card');
    cards.forEach(c => c.classList.remove('selected'));
    
    if (selectedDocxPageIdx === idx) {
        selectedDocxPageIdx = -1; // Deselect
    } else {
        selectedDocxPageIdx = idx;
        e.currentTarget.classList.add('selected');
        document.getElementById('moveDocxPageInput').value = idx + 1;
    }
}

function moveSelectedDocxPage() {
    const targetInput = document.getElementById('moveDocxPageInput');
    const targetPos = parseInt(targetInput.value);
    
    if (!targetPos || targetPos < 1 || targetPos > docxPages.length || selectedDocxPageIdx === -1) return;
    
    const newVisualIndex = targetPos - 1;
    if (selectedDocxPageIdx === newVisualIndex) return;

    // Move in array
    const item = docxPages.splice(selectedDocxPageIdx, 1)[0];
    docxPages.splice(newVisualIndex, 0, item);
    
    // Update indices
    docxPages.forEach((p, i) => p.index = i + 1);
    
    renderDocxGrid();
    selectedDocxPageIdx = -1; 
    targetInput.value = '';
}

function deleteDocxPage() {
    if (selectedDocxPageIdx === -1) return;
    if (!confirm('Delete this page?')) return;
    
    docxPages[selectedDocxPageIdx].deleted = true;
    renderDocxGrid();
    selectedDocxPageIdx = -1;
}

function saveDocxChanges() {
    // Construct config
    const pagesConfig = docxPages
        .filter(p => !p.deleted)
        .map(p => ({ original_page_number: p.original }));
        
    fetch(`/api/files/${currentFile.id}/organize-docx/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pages: pagesConfig,
            output_name: `organized_${currentFile.name}`
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showResult(`Document organized! Created ${data.file.name}`, data.file.id);
        } else {
            alert('Error: ' + data.error);
        }
    });
}

function startDocxMerge() {
    document.getElementById('mergeDocxInput').click();
}

document.getElementById('mergeDocxInput').addEventListener('change', function() {
    if(this.files.length === 0) return;
    const file = this.files[0];
    const formData = new FormData();
    formData.append('files', file);
    
    // Upload first
    fetch('/api/upload/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if(data.files && data.files.length > 0) {
            const newFile = data.files[0];
            // Call merge
            return fetch('/api/merge-docx/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_ids: [currentFile.id, newFile.id],
                    output_name: `merged_${currentFile.name}`
                })
            });
        }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showResult(`Merged successfully! Created ${data.file.name}`, data.file.id);
        } else {
            alert('Error: ' + data.error);
        }
    });
});
