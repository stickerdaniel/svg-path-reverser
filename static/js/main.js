// Initialize Ace Editor for the input
let editor = ace.edit("input-editor");
editor.setTheme("ace/theme/clouds"); // Light theme
editor.session.setMode("ace/mode/svg");
editor.setValue(defaultSvg, -1); // Set initial content
editor.renderer.setShowPrintMargin(false); // Remove the gray line

// Initialize Ace Editor for the output (result)
let resultEditor = ace.edit("output-editor");
resultEditor.setTheme("ace/theme/clouds");
resultEditor.session.setMode("ace/mode/svg");
resultEditor.setReadOnly(true); // Make the editor read-only
resultEditor.renderer.setShowPrintMargin(false); // Remove the gray line

let originalSvgCode = '';
let reversedPaths = [];

$('#parse-btn').on('click', function() {
    const svgCode = editor.getValue();
    if (svgCode.trim() === "") {
        alert("Please paste the SVG code!");
        return;
    }
    originalSvgCode = svgCode;
    $.ajax({
        url: '/process-svg',
        type: 'POST',
        data: { svg_code: svgCode },
        success: function(response) {
            const data = response.paths;
            const updatedSvg = response.updated_svg;
            $('#path-list').empty();
            reversedPaths = [];  // Reset reversed paths on each parse

            if (data.length === 0) {
                alert("No paths found in the SVG!");
                $('#paths-heading').hide();
                $('#updated-svg-container').hide();
                $('#settings').hide();
                return;
            }

            $('#paths-heading').show();
            $('#updated-svg-container').show();
            $('#settings').show();

            data.forEach(function(path, index) {
                const checkbox = `<input type="checkbox" id="path${index}" value="${index}" class="checkbox" checked>`;
                const statusBadge = `<span id="status${index}" class="badge badge-success m-1">reversed</span>`;
                let pathIdBadge = '';
                let pathClassBadge = '';
                if (path.id) {
                    pathIdBadge = `<span class="badge badge-secondary mx-1">#${path.id}</span>`;
                }
                if (path.class) {
                    pathClassBadge = `<span class="badge badge-primary mx-1">${path.class}</span>`;
                }
                // Updated Start Badge with longer width and more content
                let startValue = path.start ? `${path.start}` : 'N/A';
                const startBadge = `<span class="badge badge-info mx-2 text-nowrap">${startValue}...</span>`;
                // Added extra padding between status badge and others
                $('#path-list').append(`
                    <div class="path-item flex items-center">
                        ${checkbox}
                        ${statusBadge}
                        <div class="flex items-center mx-4">
                            ${pathIdBadge}
                            ${pathClassBadge}
                            ${startBadge}
                        </div>
                    </div>
                `);
                // Add path index to reversedPaths
                reversedPaths.push(index);
            });

            // Update the SVG with all paths reversed
            updateSvgWithReversedPaths();

            // Update the result editor with the initial updated SVG
            resultEditor.setValue(updatedSvg, -1);
        },
        error: function(xhr, status, error) {
            alert("Error: " + xhr.responseText);
        }
    });
});

$(document).on('change', '#path-list input:checkbox', function() {
    const pathIndex = parseInt($(this).val(), 10);
    const isChecked = $(this).is(':checked');
    const index = $(this).attr('id').replace('path', '');

    // Add or remove from reversedPaths array based on toggle
    if (isChecked) {
        reversedPaths.push(pathIndex);
        $('#status' + index).text('reversed').removeClass('badge-outline').addClass('badge-success');
    } else {
        reversedPaths = reversedPaths.filter(idx => idx !== pathIndex);
        $('#status' + index).text('normal').removeClass('badge-success').addClass('badge-outline');
    }

    // Update the SVG with the reversed paths
    updateSvgWithReversedPaths();
});

function updateSvgWithReversedPaths() {
    $.ajax({
        url: '/reverse-paths',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ svg_code: originalSvgCode, paths_to_reverse: reversedPaths }),
        success: function(data) {
            const updatedSvg = data.updated_svg;

            // Update the result editor
            resultEditor.setValue(updatedSvg, -1);

            // Render the updated SVG
            $('#svg-preview').html(updatedSvg);

            // Trigger a reflow
            // get element #svg-preview and force a reflow
            const elm = document.getElementById('svg-preview');
            // add 1 px to height
            elm.style.height = elm.offsetHeight + 1 + 'px';
        },
        error: function(xhr, status, error) {
            alert("Error: " + xhr.responseText);
        }
    });
}


$('#copy-btn').on('click', function() {
    const updatedSvg = resultEditor.getValue();
    navigator.clipboard.writeText(updatedSvg).then(function() {
        //alert('Updated SVG copied to clipboard!');
    }, function() {
        alert('Failed to copy SVG');
    });
});
