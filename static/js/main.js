let allFiles = [];
let currentFile = null;
let currentPage = 1;
let totalPages = 1;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload();
    loadFiles();
    
    // Close editor button
    document.getElementById('closeEditorBtn').addEventListener('click', function() {
        document.getElementById('editorSection').style.display = 'none';
    });
    
    // Merge type change
    document.getElementById('mergeType').addEventListener('change', function() {
        const joinColumnGroup = document.getElementById('joinColumnGroup');
        if (this.value === 'join') {
            joinColumnGroup.style.display = 'block';
        } else {
            joinColumnGroup.style.display = 'none';
        }
    });
    
    // Split type change
    document.getElementById('splitType').addEventListener('change', function() {
        const label = document.getElementById('splitValueLabel');
        const input = document.getElementById('splitValue');
        if (this.value === 'rows') {
            label.textContent = 'Rows per file:';
            input.placeholder = 'e.g., 1000';
        } else {
            label.textContent = 'Column name to split by:';
            input.placeholder = 'e.g., category';
        }
    });
});

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
    Array.from(files).forEach(file => {
        if (file.name.endsWith('.csv')) {
            formData.append('files', file);
        }
    });
    
    if (formData.has('files')) {
        fetch('/api/upload/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.files) {
                loadFiles();
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

// Load Files
function loadFiles() {
    fetch('/api/files/')
        .then(response => response.json())
        .then(data => {
            allFiles = data.files;
            displayFiles(allFiles);
            updateFileSelects();
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function displayFiles(files) {
    const filesList = document.getElementById('filesList');
    if (files.length === 0) {
        filesList.innerHTML = '<p>No files uploaded yet. Upload CSV files to get started.</p>';
        return;
    }
    
    filesList.innerHTML = files.map(file => `
        <div class="file-card">
            <h3>${file.name}</h3>
            <div class="file-info">📊 ${file.row_count} rows × ${file.column_count} columns</div>
            <div class="file-info">💾 ${formatFileSize(file.size)}</div>
            <div class="file-info">📅 ${new Date(file.uploaded_at).toLocaleString()}</div>
            <div class="file-actions">
                <button class="btn btn-primary" onclick="openEditor(${file.id})">Edit</button>
                <button class="btn btn-secondary" onclick="downloadFile(${file.id})">Download</button>
                <button class="btn btn-danger" onclick="deleteFile(${file.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function updateFileSelects() {
    const selects = ['splitFileSelect', 'filterFileSelect', 'aiFileSelect'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select a file</option>' + 
                allFiles.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        }
    });
    
    // Update merge checkboxes
    const mergeCheckboxes = document.getElementById('mergeFileCheckboxes');
    mergeCheckboxes.innerHTML = allFiles.map(f => `
        <label style="display: block; margin: 5px 0;">
            <input type="checkbox" value="${f.id}" class="merge-file-checkbox"> ${f.name}
        </label>
    `).join('');
}

// Editor
function openEditor(fileId) {
    currentFile = allFiles.find(f => f.id === fileId);
    currentPage = 1;
    
    fetch(`/api/files/${fileId}/data/?page=1&page_size=100`)
        .then(response => response.json())
        .then(data => {
            currentPage = data.current_page;
            totalPages = data.total_pages;
            displayTable(data.data, data.columns);
            document.getElementById('editorTitle').textContent = `Editing: ${currentFile.name}`;
            document.getElementById('editorSection').style.display = 'block';
            document.getElementById('downloadBtn').onclick = () => downloadFile(fileId);
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
            <button class="btn btn-secondary" ${currentPage === 1 ? 'disabled' : ''} 
                    onclick="changePage(${currentPage - 1})">Previous</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button class="btn btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} 
                    onclick="changePage(${currentPage + 1})">Next</button>
        </div>
    `;
    
    editorContent.innerHTML = html;
}

function changePage(page) {
    if (page < 1 || page > totalPages || !currentFile) return;
    
    fetch(`/api/files/${currentFile.id}/data/?page=${page}&page_size=100`)
        .then(response => response.json())
        .then(data => {
            currentPage = data.current_page;
            displayTable(data.data, data.columns);
        })
        .catch(error => {
            console.error('Error:', error);
        });
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
                headers: {
                    'Content-Type': 'application/json',
                },
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
            })
            .catch(error => {
                console.error('Error:', error);
                cell.textContent = currentValue;
            });
        }
    };
    
    cell.addEventListener('blur', saveEdit, { once: true });
    cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            cell.blur();
        } else if (e.key === 'Escape') {
            cell.textContent = currentValue;
            cell.contentEditable = false;
            cell.classList.remove('editing');
        }
    }, { once: true });
}

// Merge Files
function showMergeSection() {
    document.getElementById('mergeSection').style.display = 'block';
    document.getElementById('mergeSection').scrollIntoView({ behavior: 'smooth' });
}

function mergeFiles() {
    const selectedFiles = Array.from(document.querySelectorAll('.merge-file-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selectedFiles.length < 2) {
        alert('Please select at least 2 files to merge');
        return;
    }
    
    const mergeType = document.getElementById('mergeType').value;
    const joinColumn = document.getElementById('joinColumn').value;
    const outputName = document.getElementById('mergeOutputName').value || 'merged_file.csv';
    
    const data = {
        file_ids: selectedFiles,
        merge_type: mergeType,
        output_name: outputName
    };
    
    if (mergeType === 'join' && joinColumn) {
        data.join_column = joinColumn;
    }
    
    fetch('/api/merge/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Files merged successfully! Created ${data.file.name} with ${data.row_count} rows.`);
            loadFiles();
        } else {
            alert('Error merging files: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error merging files');
    });
}

// Split File
function showSplitSection() {
    document.getElementById('splitSection').style.display = 'block';
    document.getElementById('splitSection').scrollIntoView({ behavior: 'smooth' });
}

function splitFile() {
    const fileId = document.getElementById('splitFileSelect').value;
    const splitType = document.getElementById('splitType').value;
    const splitValue = document.getElementById('splitValue').value;
    const outputPrefix = document.getElementById('splitOutputPrefix').value || 'split_file';
    
    if (!fileId || !splitValue) {
        alert('Please fill all required fields');
        return;
    }
    
    fetch(`/api/files/${fileId}/split/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            split_type: splitType,
            split_value: splitValue,
            output_prefix: outputPrefix
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`File split successfully! Created ${data.count} files.`);
            loadFiles();
        } else {
            alert('Error splitting file: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error splitting file');
    });
}

// Filter File
function showFilterSection() {
    document.getElementById('filterSection').style.display = 'block';
    document.getElementById('filterSection').scrollIntoView({ behavior: 'smooth' });
    
    const fileSelect = document.getElementById('filterFileSelect');
    if (fileSelect.value) {
        updateFilterColumns(fileSelect);
    }
}

document.getElementById('filterFileSelect').addEventListener('change', function() {
    if (this.value) {
        loadFileColumns(parseInt(this.value), updateAllFilterColumns);
    }
});

function loadFileColumns(fileId, callback) {
    fetch(`/api/files/${fileId}/`)
        .then(response => response.json())
        .then(data => {
            if (callback) callback(data.columns);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function updateAllFilterColumns(columns) {
    document.querySelectorAll('.filter-column').forEach(select => {
        updateSelectOptions(select, columns);
    });
}

function updateFilterColumns(select) {
    const fileId = document.getElementById('filterFileSelect').value;
    if (fileId) {
        loadFileColumns(parseInt(fileId), (columns) => {
            updateSelectOptions(select, columns);
        });
    }
}

function updateSelectOptions(select, columns) {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select column</option>' + 
        columns.map(col => `<option value="${col}">${col}</option>`).join('');
    if (currentValue && columns.includes(currentValue)) {
        select.value = currentValue;
    }
}

function addFilterCondition() {
    const container = document.getElementById('filterConditions');
    const fileId = document.getElementById('filterFileSelect').value;
    
    const conditionDiv = document.createElement('div');
    conditionDiv.className = 'filter-condition';
    
    let columnOptions = '<option value="">Select column</option>';
    if (fileId) {
        loadFileColumns(parseInt(fileId), (columns) => {
            columnOptions = '<option value="">Select column</option>' + 
                columns.map(col => `<option value="${col}">${col}</option>`).join('');
            conditionDiv.querySelector('.filter-column').innerHTML = columnOptions;
        });
    }
    
    conditionDiv.innerHTML = `
        <select class="filter-column form-control" onchange="updateFilterColumns(this)">
            ${columnOptions}
        </select>
        <select class="filter-operator form-control">
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="greater">Greater Than</option>
            <option value="less">Less Than</option>
            <option value="not_null">Not Null</option>
            <option value="is_null">Is Null</option>
        </select>
        <input type="text" class="filter-value form-control" placeholder="Value">
        <button class="btn btn-danger" onclick="removeFilterCondition(this)">Remove</button>
    `;
    
    container.appendChild(conditionDiv);
}

function removeFilterCondition(button) {
    button.parentElement.remove();
}

function filterFile() {
    const fileId = document.getElementById('filterFileSelect').value;
    const outputName = document.getElementById('filterOutputName').value || 'filtered_file.csv';
    
    if (!fileId) {
        alert('Please select a file');
        return;
    }
    
    const conditions = Array.from(document.querySelectorAll('.filter-condition')).map(condition => {
        const column = condition.querySelector('.filter-column').value;
        const operator = condition.querySelector('.filter-operator').value;
        const value = condition.querySelector('.filter-value').value;
        
        if (!column || !operator) return null;
        
        return { column, operator, value };
    }).filter(c => c !== null);
    
    if (conditions.length === 0) {
        alert('Please add at least one filter condition');
        return;
    }
    
    fetch(`/api/files/${fileId}/filter/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filters: conditions,
            output_name: outputName
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`File filtered successfully! Created ${data.file.name} with ${data.filtered_rows} rows (from ${data.original_rows}).`);
            loadFiles();
        } else {
            alert('Error filtering file: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error filtering file');
    });
}

// AI Preprocess
function showAISection() {
    document.getElementById('aiSection').style.display = 'block';
    document.getElementById('aiSection').scrollIntoView({ behavior: 'smooth' });
}

function aiPreprocess() {
    const fileId = document.getElementById('aiFileSelect').value;
    const action = document.getElementById('aiAction').value;
    
    if (!fileId) {
        alert('Please select a file');
        return;
    }
    
    const resultsDiv = document.getElementById('aiResults');
    resultsDiv.innerHTML = '<div class="loading">Analyzing file...</div>';
    
    fetch(`/api/files/${fileId}/ai-preprocess/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: action,
            auto_fix: action === 'clean'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let html = '';
            if (data.suggestions && data.suggestions.length > 0) {
                html = '<h3>Analysis Results:</h3>';
                data.suggestions.forEach(suggestion => {
                    html += `
                        <div class="suggestion-item">
                            <strong>${suggestion.type.replace('_', ' ').toUpperCase()}</strong>
                            ${suggestion.column ? `<br>Column: ${suggestion.column}` : ''}
                            ${suggestion.count !== undefined ? `<br>Count: ${suggestion.count}` : ''}
                            ${suggestion.percentage !== undefined ? `<br>Percentage: ${suggestion.percentage}%` : ''}
                            <br><br>${suggestion.suggestion}
                        </div>
                    `;
                });
            } else {
                html = '<div class="suggestion-item success">No issues found! Your CSV file looks clean.</div>';
            }
            
            if (data.file) {
                html += `<div class="suggestion-item success">
                    <strong>Cleaned file created:</strong> ${data.file.name}<br>
                    Actions taken: ${data.actions_taken.join(', ')}
                </div>`;
                loadFiles();
            }
            
            resultsDiv.innerHTML = html;
        } else {
            resultsDiv.innerHTML = `<div class="suggestion-item error">Error: ${data.error || 'Unknown error'}</div>`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        resultsDiv.innerHTML = '<div class="suggestion-item error">Error processing file</div>';
    });
}

// Download File
function downloadFile(fileId) {
    window.open(`/api/files/${fileId}/download/`, '_blank');
}

// Delete File
function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }
    
    fetch(`/api/files/${fileId}/delete/`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadFiles();
        } else {
            alert('Error deleting file: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error deleting file');
    });
}

