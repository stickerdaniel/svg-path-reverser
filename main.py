from flask import Flask, render_template, request, jsonify
from svgpathtools import parse_path
import lxml.etree as ET
import os

app = Flask(__name__)

# Function to extract paths from SVG
def extract_paths(svg_content):
    parser = ET.XMLParser(recover=True)
    # If the content does not start with '<svg', wrap it in an <svg> tag
    if not svg_content.strip().startswith('<svg'):
        svg_content = f'<svg xmlns="http://www.w3.org/2000/svg">{svg_content}</svg>'
    root = ET.fromstring(svg_content.encode('utf-8'), parser=parser)
    # Find all path elements, regardless of namespace
    paths = []
    all_paths = root.xpath('.//svg:path | .//path', namespaces={'svg': 'http://www.w3.org/2000/svg'})
    for idx, path in enumerate(all_paths):
        d_attr = path.attrib.get('d')
        path_id = path.attrib.get('id')
        path_class = path.attrib.get('class')
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
        if path_class:
            path_info['class'] = path_class
        paths.append(path_info)
    # Return the SVG string and paths
    updated_svg = ET.tostring(root, encoding='unicode', method='xml', pretty_print=True)
    return updated_svg, paths

@app.route('/')
def index():
    # Read the default SVG file
    default_svg_path = os.path.join(app.static_folder, 'svg', 'default.svg')
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
    except ET.XMLSyntaxError as e:
        return f"Error parsing SVG: {e}", 400

@app.route('/reverse-paths', methods=['POST'])
def reverse_paths():
    svg_content = request.json['svg_code']
    paths_to_reverse = request.json['paths_to_reverse']

    # Convert paths_to_reverse to integers (indexes)
    paths_to_reverse = [int(idx) for idx in paths_to_reverse]

    # Parse the SVG content
    parser = ET.XMLParser(recover=True)
    # If the content does not start with '<svg', wrap it in an <svg> tag
    if not svg_content.strip().startswith('<svg'):
        svg_content = f'<svg xmlns="http://www.w3.org/2000/svg">{svg_content}</svg>'
    root = ET.fromstring(svg_content.encode('utf-8'), parser=parser)
    # Find all path elements
    all_paths = root.xpath('.//svg:path | .//path', namespaces={'svg': 'http://www.w3.org/2000/svg'})
    for idx, path in enumerate(all_paths):
        if idx in paths_to_reverse:
            d_attr = path.attrib.get('d')
            path_object = parse_path(d_attr)
            reversed_path = path_object.reversed().d()
            path.set('d', reversed_path)  # Set the reversed path back to the SVG

    # Convert the updated XML back to string format
    updated_svg = ET.tostring(root, encoding='unicode', method='xml', pretty_print=True)

    return jsonify({'updated_svg': updated_svg})

if __name__ == '__main__':
    app.run(debug=True)
