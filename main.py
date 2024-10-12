from flask import Flask, render_template, request, jsonify, send_file
from svgpathtools import parse_path
import lxml.etree as et
import os
import io
import zipfile

app = Flask(__name__)


# Function to extract paths from SVG
def extract_paths(svg_content):
    parser = et.XMLParser(recover=True)
    # If the content does not start with '<svg', wrap it in an <svg> tag
    if not svg_content.strip().startswith('<svg'):
        svg_content = f'<svg xmlns="http://www.w3.org/2000/svg">{svg_content}</svg>'
    root = et.fromstring(svg_content.encode('utf-8'), parser=parser)
    # Find all path elements, regardless of namespace
    paths = []
    all_paths = root.xpath('.//svg:path | .//path', namespaces={'svg': 'http://www.w3.org/2000/svg'})
    for idx, path in enumerate(all_paths):
        d_attr = path.attrib.get('d')
        path_id = path.attrib.get('id')
        path_class = path.attrib.get('class', '')
        start_point = parse_path(d_attr).point(0) if d_attr else None
        start_point_str = f"({start_point.real:.6f}, {start_point.imag:.6f})" if start_point else 'N/A'
        path_info = {
            'd': d_attr,
            'start': start_point_str,
            'attributes': dict(path.attrib),  # Convert attributes to standard dict
            'index': idx  # Use index as the identifier
        }
        if path_id:
            path_info['id'] = path_id
        # Remove 'duration-*', 'delay-*', and 'ease-*' classes from display
        class_list = [cls for cls in path_class.split() if not (cls.startswith('duration-') or cls.startswith('delay-') or cls.startswith('ease-'))]
        if class_list:
            path_info['class'] = ' '.join(class_list)
        # Parse duration, delay, and easing from classes
        duration = None
        delay = None
        easing = None
        for cls in path_class.split():
            if cls.startswith('duration-'):
                duration_value = cls[len('duration-'):].replace('_', '.')
                duration = duration_value
            elif cls.startswith('delay-'):
                delay_value = cls[len('delay-'):].replace('_', '.')
                delay = delay_value
            elif cls.startswith('ease-'):
                easing_value = cls[len('ease-'):].replace('_', '.')
                easing = easing_value
        if duration:
            path_info['duration'] = duration
        if delay:
            path_info['delay'] = delay
        if easing:
            path_info['easing'] = easing
        paths.append(path_info)
    # Return the SVG string and paths
    updated_svg = et.tostring(root, encoding='unicode', method='xml', pretty_print=True)
    return updated_svg, paths


@app.route('/')
def index():
    # Read the default SVG file
    default_svg_path = os.path.join(app.static_folder, 'svg', 'hello.svg')
    try:
        with open(default_svg_path, 'r') as f:
            default_svg = f.read()
    except FileNotFoundError:
        default_svg = ''  # If file not found, set default SVG to empty
    return render_template('index.html', default_svg=default_svg)


@app.route('/process-svg', methods=['POST'])
def process_svg():
    svg_content = request.form.get('svg_code', None)
    if not svg_content or svg_content.strip() == "":
        return "No SVG content received!", 400
    try:
        updated_svg, paths = extract_paths(svg_content)
        return jsonify({'paths': paths, 'updated_svg': updated_svg})
    except et.XMLSyntaxError as e:
        return f"Error parsing SVG: {e}", 400


@app.route('/reverse-paths', methods=['POST'])
def reverse_paths():
    svg_content = request.json['svg_code']
    paths_to_reverse = request.json['paths_to_reverse']
    path_data = request.json.get('path_data', [])

    # Convert paths_to_reverse to integers (indexes)
    paths_to_reverse = [int(idx) for idx in paths_to_reverse]

    # Create a mapping from index to duration, delay, and easing
    path_data_dict = {int(item['index']): {'duration': item.get('duration'),
                                           'delay': item.get('delay'),
                                           'easing': item.get('easing')} for item in path_data}

    # Parse the SVG content
    parser = et.XMLParser(recover=True)
    # If the content does not start with '<svg', wrap it in an <svg> tag
    if not svg_content.strip().startswith('<svg'):
        svg_content = f'<svg xmlns="http://www.w3.org/2000/svg">{svg_content}</svg>'
    root = et.fromstring(svg_content.encode('utf-8'), parser=parser)
    # Find all path elements
    all_paths = root.xpath('.//svg:path | .//path', namespaces={'svg': 'http://www.w3.org/2000/svg'})
    for idx, path in enumerate(all_paths):
        if idx in paths_to_reverse:
            d_attr = path.attrib.get('d')
            path_object = parse_path(d_attr)
            reversed_path = path_object.reversed().d()
            path.set('d', reversed_path)  # Set the reversed path back to the SVG

        # Update the class attribute to include duration, delay, and easing classes
        classes = path.attrib.get('class', '').split()
        # Remove existing duration-*, delay-*, and ease-* classes
        classes = [cls for cls in classes if not (cls.startswith('duration-') or cls.startswith('delay-') or cls.startswith('ease-'))]
        # Get duration, delay, and easing from path_data_dict
        duration = path_data_dict.get(idx, {}).get('duration')
        delay = path_data_dict.get(idx, {}).get('delay')
        easing = path_data_dict.get(idx, {}).get('easing')
        # If duration is provided
        if duration:
            duration_class_value = duration.replace('.', '_')
            duration_class = f'duration-{duration_class_value}'
            classes.append(duration_class)
        # If delay is provided
        if delay:
            delay_class_value = delay.replace('.', '_')
            delay_class = f'delay-{delay_class_value}'
            classes.append(delay_class)
        # If easing is provided
        if easing:
            easing_class_value = easing.replace('.', '_')
            easing_class = f'ease-{easing_class_value}'
            classes.append(easing_class)
        # Update the class attribute
        if classes:
            path.attrib['class'] = ' '.join(classes)
        else:
            # Remove class attribute if empty
            if 'class' in path.attrib:
                del path.attrib['class']

    # Convert the updated XML back to string format
    updated_svg = et.tostring(root, encoding='unicode', method='xml', pretty_print=True)

    return jsonify({'updated_svg': updated_svg})


@app.route('/download-animation', methods=['POST'])
def download_animation():
    # Retrieve the modified SVG from the request
    modified_svg = request.json.get('svg_code', None)
    if not modified_svg:
        return "Error: Modified SVG not provided", 400

    # Retrieve the animation scale from the request
    animation_scale = request.json.get('animation_scale', None)
    if not animation_scale:
        return "Error: Animation scale not provided", 400, {'Content-Type': 'text/plain'}

    # Create a zip file in memory
    zip_buffer = io.BytesIO()

    # Paths to the static files in zip_files folder
    anim_mjs_path = os.path.join(app.static_folder, 'js', 'anim.mjs')
    index_html_path = os.path.join(app.static_folder, 'zip_files', 'index.html')

    # Read anim.mjs
    try:
        with open(anim_mjs_path, 'r') as anim_mjs_file:
            anim_mjs_content = anim_mjs_file.read()
    except FileNotFoundError:
        return "Error: anim.mjs file not found", 404

    # Read index.html
    try:
        with open(index_html_path, 'r') as index_file:
            index_html_content = index_file.read()
    except FileNotFoundError:
        return "Error: index.html file not found", 404

    # Inject the modified SVG into the index.html content
    index_html_content = index_html_content.replace("<!-- SVG_PLACEHOLDER -->", modified_svg)
    index_html_content = index_html_content.replace("const animationScale = 1;", f"const animationScale = {animation_scale};")

    # Create the zip file and add the files
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr('anim.mjs', anim_mjs_content)  # Add anim.mjs to zip
        zip_file.writestr('index.html', index_html_content)  # Add modified index.html to zip

    # Prepare the zip file for download
    zip_buffer.seek(0)
    return send_file(zip_buffer, mimetype='application/zip', as_attachment=True, download_name='animation.zip')


if __name__ == '__main__':
    # Use different port for development
    app.run(debug=True, port=5000)