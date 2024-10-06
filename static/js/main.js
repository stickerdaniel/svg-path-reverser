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

// this array will store the indexes of paths that are reversed
let reversedPaths = [];

// variables to store SVG content
let originalSvg = '';
let modifiedSvg = '';

$('#parse-btn').on('click', function() {
    const svgCode = editor.getValue();

    // Check if the SVG code is empty
    if (svgCode.trim() === "") {
        showSwal('No SVG code', 'Please enter an SVG code!', false);
        return;
    }
    originalSvg = svgCode;
    $.ajax({
        url: '/process-svg',
        type: 'POST',
        data: { svg_code: svgCode },
        success: function(response) {
            const data = response.paths;
            originalSvg = response.updated_svg;
            $('#path-list').empty();
            reversedPaths = [];  // Reset reversed paths on each parse

            // Check if any paths are found in the SVG
            if (data.length === 0) {
                showSwal('No Paths Found', 'No paths found in the SVG!', false);
                showResultUI(false);
                return;
            }

            showResultUI(true);

            data.forEach(function(path, index) {
                const checkbox = `<input type="checkbox" id="path${index}" value="${index}" class="checkbox" checked>`;
                const statusBadge = `<span id="status${index}" class="badge badge-success m-1">reversed</span>`;
                let pathIdBadge = '';
                let pathClassBadge = '';
                // id badge
                if (path.id) {
                    pathIdBadge = `<span class="badge badge-secondary mx-1">#${path.id}</span>`;
                }
                // class badge
                if (path.class) {
                    pathClassBadge = `<span class="badge badge-primary mx-1">${path.class}</span>`;
                }
                // start value badge
                let startValue = path.start ? `${path.start}` : 'N/A';
                const startBadge = `<span class="badge badge-info mx-2 text-nowrap">${startValue}...</span>`;
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
            resultEditor.setValue(originalSvg, -1);

            // Render the original SVG in the preview
            $('#svg-preview').html(originalSvg);
        },
        error: function(xhr) {
            showSwal('Error', 'Error parsing the SVG!\n' + xhr.responseText, false);
        }
    });
});

$(document).on('change', '#path-list input:checkbox', function() {
    const pathIndex = parseInt($(this).val(), 10);
    const isChecked = $(this).is(':checked');
    const index = $(this).attr('id').replace('path', '');

    // Add or remove from reversedPaths array based on toggle
    if (isChecked) {
        // Add path index to reversedPaths
        reversedPaths.push(pathIndex);
        // Update the status badge
        $('#status' + index).text('reversed').removeClass('badge-outline').addClass('badge-success');
    } else {
        // Remove path index from reversedPaths
        reversedPaths = reversedPaths.filter(idx => idx !== pathIndex);
        // Update the status badge
        $('#status' + index).text('normal').removeClass('badge-success').addClass('badge-outline');
    }

    // Update the SVG with the reversed paths
    updateSvgWithReversedPaths();
});

// Function to update the SVG with the reversed paths
function updateSvgWithReversedPaths() {
    $.ajax({
        url: '/reverse-paths',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ svg_code: originalSvg, paths_to_reverse: reversedPaths }),
        success: function(data) {
            modifiedSvg = data.updated_svg;

            // Update the result editor
            resultEditor.setValue(modifiedSvg, -1);

            // Render the updated SVG
            $('#svg-preview').html(modifiedSvg);

            // Trigger a reflow to fix the SVG height issue
            const elm = document.getElementById('svg-preview');
            elm.style.height = elm.offsetHeight + 1 + 'px';
            elm.style.height = elm.offsetHeight - 1 + 'px';
        },
        error: function(xhr) {
            showSwal('Error', 'Error updating the SVG with reversed paths!\n' + xhr.responseText, false);
        }
    });
}

// Function to show/hide the result UI elements after parsing SVG
function showResultUI(show) {
    if (show) {
        $('#paths-heading').show();
        $('#updated-svg-container').show();
        $('#settings').show();
    } else {
        $('#paths-heading').hide();
        $('#updated-svg-container').hide();
        $('#settings').hide();
    }
}

// event listener for copy button to copy the updated SVG to clipboard
$('#copy-btn').on('click', function() {
    navigator.clipboard.writeText(modifiedSvg).then(function() {
        showSwal('Copied!', 'Updated SVG copied to clipboard!', true);
    }, function() {
        showSwal('Copy Failed', 'Failed to copy the updated SVG!', false);
    });
});

$('#download-btn').on('click', function() {
    const modifiedSvg = resultEditor.getValue();  // Get the modified SVG from the editor

    // Make an AJAX request to the server to download the zip file
    $.ajax({
        url: '/download-animation',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ svg_code: modifiedSvg }),  // Send the modified SVG to the server
        xhrFields: {
            responseType: 'blob'  // Expect the response to be a binary file (zip)
        },
        success: function(blob) {
            // Create a temporary link element to trigger the download
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);  // Create a URL for the blob
            link.download = 'animation.zip';  // Specify the filename
            document.body.appendChild(link);
            link.click();  // Programmatically click the link to trigger the download
            document.body.removeChild(link);  // Clean up after download

            showSwal('Download Complete', 'The animation.zip has been downloaded successfully!', true);
        },
        error: function(xhr) {
            showSwal('Download Failed', 'Error downloading the animation zip!\n' + xhr.responseText, false);
        }
    });
});

// event listeners for animation buttons to animate the SVG paths
$('#animate-original').on('click', function() {
    // Display the original SVG
    $('#svg-preview').html(originalSvg);
    // Animate the paths
    let svgElement = $('#svg-preview svg')[0];
    animateSVGPaths(svgElement, 2); // Animate over 2 seconds
});
$('#animate-reverted').on('click', function() {
    // Display the modified SVG
    $('#svg-preview').html(modifiedSvg);
    // Animate the paths
    let svgElement = $('#svg-preview svg')[0];
    animateSVGPaths(svgElement, 2); // Animate over 2 seconds
});

// sweetalert2 configuration
function showSwal(title, text, success) {
    Swal.fire({
        icon: success ? 'success' : 'error',
        title: title,
        text: text,
        confirmButtonText: 'OK',
        buttonsStyling: false,
        customClass: {
            confirmButton: 'btn btn-primary px-6', // Apply DaisyUI button styles
            popup: 'rounded-box',
        },
    });
}

