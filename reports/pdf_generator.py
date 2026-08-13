"""
PDF generator using WeasyPrint.
Generates professional PDF reports from prediction data.
"""
from typing import Dict, Any
import io


class PDFGenerator:
    """Generates PDF reports using WeasyPrint."""
    
    def generate_pdf(self, data: Dict[str, Any]) -> bytes:
        """
        Generate PDF report from prediction data.
        
        Args:
            data: Prediction data dictionary
        
        Returns:
            PDF file bytes
        """
        try:
            from weasyprint import HTML
            
            # Generate HTML template
            html_content = self._generate_html_template(data)
            
            # Convert to PDF
            pdf_bytes = HTML(string=html_content).write_pdf()
            
            return pdf_bytes
            
        except ImportError:
            # Fallback if WeasyPrint not available
            return self._generate_fallback_pdf(data)
    
    def _generate_html_template(self, data: Dict[str, Any]) -> str:
        """Generate HTML template for PDF conversion."""
        predictions = data.get('predictions', [])
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>F1 Predictor 2026 - Race Predictions</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    margin: 40px;
                    color: #15151E;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 40px;
                    border-bottom: 2px solid #E10600;
                    padding-bottom: 20px;
                }}
                .logo {{
                    font-size: 48px;
                    font-weight: 900;
                    color: #E10600;
                }}
                .title {{
                    font-size: 24px;
                    font-weight: 700;
                    margin-top: 10px;
                }}
                .metadata {{
                    background-color: #F4F5F7;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                }}
                .metadata-row {{
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }}
                .predictions-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }}
                .predictions-table th {{
                    background-color: #E10600;
                    color: white;
                    padding: 12px;
                    text-align: left;
                    font-weight: 600;
                }}
                .predictions-table td {{
                    padding: 12px;
                    border-bottom: 1px solid #E3E5EA;
                }}
                .predictions-table tr:nth-child(even) {{
                    background-color: #F9FAFB;
                }}
                .probability-bar {{
                    width: 100%;
                    height: 20px;
                    background-color: #E3E5EA;
                    border-radius: 4px;
                    overflow: hidden;
                }}
                .probability-fill {{
                    height: 100%;
                    background-color: #E10600;
                }}
                .confidence-section {{
                    background-color: #16233F;
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 40px;
                    color: #6B7280;
                    font-size: 12px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">F1</div>
                <div class="title">Predictor 2026 - Race Predictions</div>
            </div>
            
            <div class="metadata">
                <div class="metadata-row">
                    <span><strong>Race:</strong> {data.get('race_id', 'Unknown')}</span>
                    <span><strong>Session:</strong> {data.get('session_type', 'Unknown')}</span>
                </div>
                <div class="metadata-row">
                    <span><strong>Weather:</strong> {data.get('weather', 'Unknown')}</span>
                    <span><strong>Target:</strong> {data.get('target_id', 'Unknown')}</span>
                </div>
            </div>
            
            <h2>Predictions</h2>
            <table class="predictions-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Driver</th>
                        <th>Probability</th>
                        <th>Visual</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for i, prediction in enumerate(predictions, 1):
            driver_code = prediction.get('driver_code', 'Unknown')
            probability = prediction.get('probability', 0.0)
            percentage = probability * 100
            
            html += f"""
                    <tr>
                        <td>{i}</td>
                        <td>{driver_code}</td>
                        <td>{percentage:.1f}%</td>
                        <td>
                            <div class="probability-bar">
                                <div class="probability-fill" style="width: {percentage}%"></div>
                            </div>
                        </td>
                    </tr>
            """
        
        confidence = data.get('confidence', 0.0)
        html += f"""
                </tbody>
            </table>
            
            <div class="confidence-section">
                <h3>Confidence Score: {confidence:.2f}</h3>
            </div>
            
            <div class="footer">
                <p>Generated by F1 Predictor 2026</p>
                <p>Report generated on {__import__('datetime').datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _generate_fallback_pdf(self, data: Dict[str, Any]) -> bytes:
        """Generate fallback PDF if WeasyPrint not available."""
        # Return a simple text file as fallback
        from reports.csv_excel_report import CSVExcelReportGenerator
        
        generator = CSVExcelReportGenerator()
        text_content = generator.generate_summary_text(data)
        
        return text_content.encode('utf-8')
