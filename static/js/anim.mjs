// anim.mjs

// Function to get the total length of the SVG path
function getPathLength(path) {
    return path.getTotalLength();
}

// Function to animate all SVG paths
function animateSVGPaths(svgElement, animationScale) {
    // All paths in the SVG
    let paths = svgElement.querySelectorAll('path');
    // Create a GSAP timeline
    let tl = gsap.timeline();

    paths.forEach(function (path) {
        // Get duration and delay from the path's classes
        let duration = 2; // default duration
        let delay = 0;    // default delay

        let classList = path.getAttribute('class') ? path.getAttribute('class').split(' ') : [];

        classList.forEach(function(cls) {
            if (cls.startsWith('duration-')) {
                let durationValue = cls.replace('duration-', '').replace('_', '.');
                duration = parseFloat(durationValue);
            }
            if (cls.startsWith('delay-')) {
                let delayValue = cls.replace('delay-', '').replace('_', '.');
                delay = parseFloat(delayValue);
            }
        });

        // Animate the path
        animatePath(path, tl, duration, delay);
    });

    // Apply timeScale to the timeline
    tl.timeScale(animationScale);
}

// Function to animate a single SVG path using GSAP
function animatePath(path, timeline, duration, delay) {
    const totalLength = getPathLength(path);

    // Ensure the user sees some effect even if the SVG is not optimized
    const computedStyle = getComputedStyle(path);
    // If stroke is not visible (not set or stroke width is 0)
    if (!computedStyle.stroke || computedStyle.stroke === 'none' || computedStyle.strokeWidth === '0px') {
        // Debug log to identify what is missing
        console.log('Stroke: ' + computedStyle.stroke + ', Stroke Width: ' + computedStyle.strokeWidth);

        gsap.set(path, {
            stroke: 'black', // Ensure stroke is visible
            strokeWidth: 2,
            fill: 'none'     // Remove fill to see the stroke
        });
    }

    // Set initial styles for animation
    gsap.set(path, {
        strokeDasharray: totalLength + 2,
        strokeDashoffset: totalLength + 3,
    });

    // Add animation to the timeline
    timeline.to(path, {
        strokeDashoffset: 0,
        duration: duration,
        ease: "power3.out"
    }, delay); // Use delay as the position parameter
}