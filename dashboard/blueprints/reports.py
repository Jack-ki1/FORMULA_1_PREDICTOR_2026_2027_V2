"""
Reports blueprint - CSV/JSON/print/share exports.
"""
from flask import Blueprint, render_template, jsonify, request, send_file
from reports.csv_excel_report import CSVExcelReportGenerator
from reports.pdf_generator import PDFGenerator
from reports.share_card_generator import ShareCardGenerator
import io

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/')
def reports():
    """Render reports page."""
    return render_template('reports.html')

@reports_bp.route('/api/export/csv', methods=['POST'])
def api_export_csv():
    """Export predictions as CSV."""
    data = request.json
    
    try:
        generator = CSVExcelReportGenerator()
        csv_data = generator.generate_csv(data)
        
        return send_file(
            io.BytesIO(csv_data.encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='predictions.csv'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/api/export/json', methods=['POST'])
def api_export_json():
    """Export predictions as JSON."""
    data = request.json
    
    try:
        generator = CSVExcelReportGenerator()
        json_data = generator.generate_json(data)
        
        return jsonify(json_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/api/export/pdf', methods=['POST'])
def api_export_pdf():
    """Export predictions as PDF."""
    data = request.json
    
    try:
        generator = PDFGenerator()
        pdf_data = generator.generate_pdf(data)
        
        return send_file(
            io.BytesIO(pdf_data),
            mimetype='application/pdf',
            as_attachment=True,
            download_name='predictions.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/api/share-card', methods=['POST'])
def api_share_card():
    """Generate shareable summary card."""
    data = request.json
    
    try:
        generator = ShareCardGenerator()
        card_data = generator.generate_card(data)
        
        return jsonify(card_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
