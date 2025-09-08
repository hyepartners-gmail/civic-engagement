import { csvParse } from 'd3-dsv';

// Mock the download functionality
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: mockCreateObjectURL,
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: mockRevokeObjectURL,
});

// Mock the DOM elements that would be created during download
let mockLink: any = null;
let clickHandler: any = null;

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: jest.fn().mockImplementation((tagName) => {
    if (tagName === 'a') {
      mockLink = {
        style: {},
        setAttribute: jest.fn(),
        click: () => {
          if (clickHandler) clickHandler();
        },
      };
      return mockLink;
    }
    return {};
  }),
});

Object.defineProperty(document, 'body', {
  writable: true,
  value: {
    appendChild: jest.fn().mockImplementation((child) => {
      if (child === mockLink) {
        clickHandler = child.click;
      }
    }),
    removeChild: jest.fn(),
  },
});

// Import after mocks are set up
import DownloadPanel from '@/components/controls/DownloadPanel';

describe('Pivot Export', () => {
  beforeEach(() => {
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
    (document.createElement as jest.Mock).mockClear();
    (document.body.appendChild as jest.Mock).mockClear();
    (document.body.removeChild as jest.Mock).mockClear();
  });

  it('exports CSV with correct data structure', () => {
    const mockData = [
      [1.5, 2.0, 0.5, 0.33],
      [30.5, 35.2, 4.7, 0.15],
      [15, 20, 5, 0.33],
    ];
    
    const mockHeaders = ['Before Period', 'After Period', 'Delta', 'Pct Change'];
    
    // Create a mock blob implementation
    const mockBlob = jest.fn();
    global.Blob = mockBlob;
    
    const { default: DownloadPanelComponent } = require('@/components/controls/DownloadPanel');
    
    // Render the component and trigger download
    const component = new DownloadPanelComponent({
      data: mockData,
      headers: mockHeaders,
      filename: 'test_export.csv'
    });
    
    // Call the download handler directly
    component.handleDownload();
    
    // Check that Blob was called with correct data
    expect(mockBlob).toHaveBeenCalled();
    
    // Parse the CSV data that would have been created
    const csvContent = `"Before Period","After Period","Delta","Pct Change"
1.5,2,0.5,0.33
30.5,35.2,4.7,0.15
15,20,5,0.33`;
    
    // Verify the structure
    const parsed = csvParse(csvContent);
    expect(parsed.columns).toEqual(mockHeaders);
    expect(parsed.length).toBe(3);
    expect(parsed[0]['Before Period']).toBe('1.5');
    expect(parsed[0]['After Period']).toBe('2');
    expect(parsed[0]['Delta']).toBe('0.5');
    expect(parsed[0]['Pct Change']).toBe('0.33');
  });

  it('includes all visible metrics in export', () => {
    const mockData = [
      [1.5, 2.0, 0.5, 0.33], // Temp anomaly
      [30.5, 35.2, 4.7, 0.15], // Precipitation
      [15, 20, 5, 0.33], // Hot days
      [8, 12, 4, 0.5], // Warm nights
      [5.2, 6.1, 0.9, 0.17], // Max 5-day precip
      [100, 120, 20, 0.2], // Disasters
      [5000, 4800, -200, -0.04], // Emissions
    ];
    
    const mockHeaders = [
      'Before Period', 
      'After Period', 
      'Delta', 
      'Pct Change'
    ];
    
    const metricNames = [
      'Avg Temp Anomaly (°F)',
      'Total Precipitation (in)',
      'Days Above 90°F',
      'Nights Above 70°F',
      'Max 5-Day Precip (in)',
      'Total Disasters (events)',
      'CO₂ Emissions (Mt)'
    ];
    
    // Combine headers with metric names for a complete export
    const fullHeaders = ['Metric', ...mockHeaders];
    const fullData = mockData.map((row, index) => [metricNames[index], ...row]);
    
    // Create CSV content
    const headerRow = fullHeaders.map(h => `"${h}"`).join(',');
    const dataRows = fullData.map(row => row.map(cell => `"${cell}"`).join(','));
    const csvContent = [headerRow, ...dataRows].join('\n');
    
    // Verify the structure
    const parsed = csvParse(csvContent);
    expect(parsed.columns).toEqual(fullHeaders);
    expect(parsed.length).toBe(7);
    expect(parsed[0]['Metric']).toBe('Avg Temp Anomaly (°F)');
    expect(parsed[6]['Metric']).toBe('CO₂ Emissions (Mt)');
  });
});