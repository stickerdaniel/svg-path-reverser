// anim.mjs

// Function to get the total length of the SVG path
function getPathLength(path) {
    return path.getTotalLength();
}

// Function to animate all SVG paths with animate class
function animateSVGPaths(svgElement, duration) {
    // all paths in the SVG with 'animate' class
    let paths = svgElement.querySelectorAll('path.animate');
    // if no paths found, animate all paths
    if (paths.length === 0) {
        paths = svgElement.querySelectorAll('path');
    }
    paths.forEach(function (path) {
        animatePath(path, duration);
    });
}

// Function to animate a single SVG path using GSAP
function animatePath(path, duration) {
    const totalLength = getPathLength(path);

    // ensure the user sees some effect even if the svg is not optimized
    const computedStyle = getComputedStyle(path);
    // if stroke is not visible (not set or stroke width is 0)
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
        strokeDasharray: totalLength+1,
        strokeDashoffset: totalLength+2,
    });
    // Animate the stroke
    gsap.to(path, {
        strokeDashoffset: 0,
        duration: duration,
        ease: "power3.out",
        delay: 0.2
    });
}