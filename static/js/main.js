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

// Variable to store the animation scale
let animationScale = 1; // Default scale

// Define arrays for easing functions and types
const easingFunctions = [
    'linear',
    'power1',
    'power2',
    'power3',
    'power4',
    'back',
    'bounce',
    'circ',
    'elastic',
    'expo',
    'sine',
    'steps'
];

const easingTypes = ['.in', '.out', '.inOut'];

$('#parse-btn').on('click', function () {
    const svgCode = editor.getValue();

    // Check if the SVG code is empty
    if (svgCode.trim() === "") {
        showSwal('No SVG code', 'Please enter an SVG code!', false);
        return;
    }
    originalSvg = svgCode;
    $.ajax({
        url: '/process-svg', type: 'POST', data: {svg_code: svgCode}, success: function (response) {
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

            data.forEach(function (path, index) {
                const checkbox = `<input type="checkbox" id="path${index}" value="${index}" class="checkbox" checked>`;
                const statusBadge = `<span id="status${index}" class="badge badge-success m-1">reversed</span>`;
                let pathIdBadge = '';
                let pathClassBadge = '';
                // Get duration and delay from path
                let durationValue = path.duration || '';
                let delayValue = path.delay || '';
                const animationDurationInput = `<div class="tooltip" data-tip="duration"><input type="text" value="${durationValue}" placeholder="2" class="input-duration input input-bordered input-accent input-xs w-10 text-center m-1" /></div>`;
                const animationDelayInput = `<div class="tooltip" data-tip="delay"><input type="text" value="${delayValue}" placeholder="0" class="input-delay input input-bordered input-accent input-xs w-10 text-center m-1" /></div>`;

                // id badge
                if (path.id) {
                    pathIdBadge = `<span class="badge badge-secondary mx-1">#${path.id}</span>`;
                }
                // class badge
                if (path.class) {
                    // Filter out 'duration-*', 'delay-*', and 'animate' classes
                    let filteredClasses = path.class.split(' ').filter(cls => {
                        return !cls.startsWith('duration-') && !cls.startsWith('delay-') && cls !== 'animate';
                    }).join(' ');
                    if (filteredClasses) {
                        pathClassBadge = `<span class="badge badge-primary mx-1 whitespace-nowrap">${filteredClasses}</span>`;
                    }
                }
                // start value badge
                let startValue = path.start ? `${path.start}` : 'N/A';
                const startBadge = `<span class="badge badge-info mx-2 text-nowrap">${startValue}...</span>`;

                // Get easing from path
                let easingValue = path.easing || '';
                let easingFunction = '';
                let easingType = '';
                if (easingValue) {
                    let parts = easingValue.split('.');
                    easingFunction = parts[0]; // e.g., 'power2'
                    easingType = parts[1] ? '.' + parts[1] : ''; // e.g., '.out'
                }

                // Create easing function options
                function createEasingFunctionOptions(selectedFunction) {
                    return easingFunctions.map(function (easeFunc) {
                        let selected = (easeFunc === selectedFunction || (!selectedFunction && easeFunc === 'power1')) ? 'selected' : '';
                        return `<option value="${easeFunc}" ${selected}>${easeFunc}</option>`;
                    }).join('');
                }

                // Create easing type options
                function createEasingTypeOptions(selectedType) {
                    return easingTypes.map(function (easeType) {
                        let label = easeType.replace('.', '') || 'out'; // Default to 'out' if empty
                        let selected = (easeType === selectedType || (!selectedType && easeType === '.out')) ? 'selected' : '';
                        return `<option value="${easeType}" ${selected}>${label}</option>`;
                    }).join('');
                }

                const easingFunctionSelect = `<div class="tooltip" data-tip="easing function"><select class="select-easing-function select select-accent select-xs m-1">
                ${createEasingFunctionOptions(easingFunction)}
                </select></div>`;

                const easingTypeSelect = `<div class="tooltip" data-tip="easing type"><select class="select-easing-type select select-accent select-xs m-1">
                ${createEasingTypeOptions(easingType)}
                </select></div>`;

                // Append the path item with the new selects
                $('#path-list').append(`
                    <div class="path-item flex items-center">
                        ${checkbox}
                        ${statusBadge}
                        <div class="flex items-center ml-4 w-full">
                            ${pathIdBadge}
                            ${pathClassBadge}
                            ${startBadge}
                            <div class="grow"></div>
                            ${animationDurationInput}
                            ${animationDelayInput}
                            ${easingFunctionSelect}
                            ${easingTypeSelect}
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
        }, error: function (xhr) {
            showSwal('Error', 'Error parsing the SVG!\n' + xhr.responseText, false);
        }
    });
});

$(document).on('change', '#path-list input:checkbox', function () {
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
    // Collect duration, delay, and easing values
    let pathData = [];
    $('#path-list .path-item').each(function(index) {
        let duration = $(this).find('.input-duration').val();
        let delay = $(this).find('.input-delay').val();
        let easingFunction = $(this).find('.select-easing-function').val();
        let easingType = $(this).find('.select-easing-type').val();
        let easing = '';
        if (easingFunction) {
            easing = easingFunction;
            if (easingType) {
                easing += easingType;
            }
        }
        pathData.push({
            index: index,
            duration: duration,
            delay: delay,
            easing: easing
        });
    });

    $.ajax({
        url: '/reverse-paths',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            svg_code: originalSvg,
            paths_to_reverse: reversedPaths,
            path_data: pathData  // Send duration, delay, and easing data
        }),
        success: function (data) {
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
        error: function (xhr) {
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
$('#copy-btn').on('click', function () {
    navigator.clipboard.writeText(modifiedSvg).then(function () {
        showSwal('Copied!', 'Updated SVG copied to clipboard!', true);
    }, function () {
        showSwal('Copy Failed', 'Failed to copy the updated SVG!', false);
    });
});

$('#download-btn').on('click', function () {
    const modifiedSvg = resultEditor.getValue();  // Get the modified SVG from the editor

    // Make an AJAX request to the server to download the zip file
    $.ajax({
        url: '/download-animation',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({svg_code: modifiedSvg}),  // Send the modified SVG to the server
        xhrFields: {
            responseType: 'blob'  // Expect the response to be a binary file (zip)
        },
        success: function (blob) {
            // Create a temporary link element to trigger the download
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);  // Create a URL for the blob
            link.download = 'animation.zip';  // Specify the filename
            document.body.appendChild(link);
            link.click();  // Programmatically click the link to trigger the download
            document.body.removeChild(link);  // Clean up after download

            showSwal('Download Complete', 'The animation.zip has been downloaded successfully!', true);
        },
        error: function (xhr) {
            showSwal('Download Failed', 'Error downloading the animation zip!\n' + xhr.responseText, false);
        }
    });
});

// event listeners for animation buttons to animate the SVG paths
$('#animate-original').on('click', function () {
    // Display the original SVG
    $('#svg-preview').html(originalSvg);
    // Animate the paths
    let svgElement = $('#svg-preview svg')[0];
    animateSVGPaths(svgElement, animationScale);
});
$('#animate-edited').on('click', function () {
    // Display the modified SVG
    $('#svg-preview').html(modifiedSvg);
    // Animate the paths
    let svgElement = $('#svg-preview svg')[0];
    animateSVGPaths(svgElement, animationScale);
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

// Cache the necessary DOM elements
const $speedSlider = $('#speed-slider');
const $speedBadge = $('#speed-badge');
const $pathList = $('#path-list');

// Capture speed factor from the slider and update the badge
$speedSlider.on('input', function () {
    const speedPercent = parseFloat($(this).val());
    $speedBadge.text(`${speedPercent}%`);
    animationScale = speedPercent * 0.01;
    // No need to update duration and delay inputs
});

// Capture inputs for duration and delay, and remove non-numeric characters
$pathList.on('input', '.input-duration', function () {
    let duration = $(this).val() || ''; // Allow empty string
    // Remove any non-numeric characters
    duration = duration.replace(/[^\d.]/g, '');
    // Update the input field with the cleaned value
    $(this).val(duration);
    // Update the SVG with new duration
    updateSvgWithReversedPaths();
});

$pathList.on('input', '.input-delay', function () {
    let delay = $(this).val() || ''; // Allow empty string
    // Remove any non-numeric characters
    delay = delay.replace(/[^\d.]/g, '');
    // Update the input field with the cleaned value
    $(this).val(delay);
    // Update the SVG with new delay
    updateSvgWithReversedPaths();
});

// Event listeners for easing function and type selects
$pathList.on('change', '.select-easing-function', function() {
    updateSvgWithReversedPaths();
});

$pathList.on('change', '.select-easing-type', function() {
    updateSvgWithReversedPaths();
});