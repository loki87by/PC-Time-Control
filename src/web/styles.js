export const COMMON = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    padding: 20px;
    background: linear-gradient(135deg, #66d0ea 0%, #764ba2 100%);
    min-height: 100vh;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
  }
  .card {
    background: white;
    border-radius: 15px;
    padding: 20px;
    margin: 15px 0;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  .card-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 15px;
  }
  .btn {
    display: block;
    width: 100%;
    padding: 15px;
    margin: 8px 0;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .btn:hover { transform: scale(1.02); }
  .btn:active { transform: scale(0.98); }
  .btn-lock { background: #ff9800; color: white; }
  .btn-shutdown { background: #f44336; color: white; }
  .btn-primary { background: #667eea; color: white; }
  .btn-success { background: #4CAF50; color: white; }
  .btn-danger { background: #f44336; color: white; }
  .btn-warning { background: #ff5722; color: white; }
  input, select {
    width: 100%;
    padding: 12px;
    margin: 8px 0;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.3s;
  }
  input:focus {
    border-color: #667eea;
    outline: none;
  }
  .alert {
    position: fixed;
    top: 0;
    left: 10%;
    width: 80%;
    padding: 15px;
    border-radius: 10px;
    box-sizing: border-box;
    margin: 10px 0;
    display: none;
  }
  .alert-success {
    background: #13e644;
    color: #101111;
    display: block;
  }
  .alert-error {
    background: #de3442;
    color: ##f9f9f9;
    display: block;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: #666; }
  .info-value { font-weight: 500; color: #333; }
  .status-badge {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
`;

export const INDEX = `
  .header {
    background: white;
    padding: 20px;
    border-radius: 15px;
    margin-bottom: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    text-align: center;
  }
  .header h1 { color: #333; font-size: 24px; }
  .header p { color: #666; margin-top: 5px; font-size: 14px; }
  .scan-btn {
    display: block;
    width: 100%;
    padding: 15px;
    margin: 20px 0;
    background: linear-gradient(135deg, #eada66 0%, #cd8021 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .scan-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .refresh-btn {
    display: block;
    width: 100%;
    padding: 10px;
    margin: 10px 0;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    cursor: pointer;
  }
  .scan-btn:hover, .refresh-btn:hover { transform: scale(1.02); }
  .pc-card {
    background: white;
    padding: 20px;
    margin: 10px 0;
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pc-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .pc-info { flex: 1; }
  .pc-name { font-size: 18px; font-weight: 600; color: #333; }
  .pc-ip { font-size: 12px; color: #999; margin-top: 2px; }
  .pc-user { font-size: 13px; color: #666; margin-top: 4px; }
  .status-online { background: #4CAF50; color: white; }
  .status-locked { background: #ff9800; color: white; }
  .status-offline { background: #f44336; color: white; }
  .empty-state {
    background: white;
    padding: 40px 20px;
    border-radius: 12px;
    text-align: center;
    color: #999;
  }
  .empty-state .emoji { font-size: 48px; display: block; margin-bottom: 15px; }
  .footer { text-align: center; color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 30px; }

  @media (max-width: 480px) {
    .pc-card { flex-direction: column; align-items: flex-start; gap: 10px; }
    .status-badge { align-self: flex-start; }
  }
`;

export const CONTROL = `
  .back-btn {
    max-width: 120px;
    max-height: 40px;
    display: inline-block;
    padding: 10px 20px;
    background: rgba(255,255,255,0.2);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    margin-bottom: 20px;
    backdrop-filter: blur(10px);
    grid-column: 1 / -1;
  }
  .pc-header { text-align: center; padding: 20px; }
  .pc-header h1 { color: #333; font-size: 24px; }
  .pc-header .ip { color: #999; font-size: 14px; }
  .pc-header .user { color: #666; margin-top: 5px; }
  .user { margin-bottom: 5px; }
  .status-unlocked { background: #4CAF50; color: white; }
  .quick-limits {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 10px 0;
  }
  .quick-limit {
    padding: 8px 15px;
    background: #f0f0f0;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
    border: none;
  }
  .quick-limit:hover { background: #e0e0e0; }
  
  @media (max-width: 480px) {
    .quick-limits { justify-content: center; }
  }

  @media (min-width: 800px) {
    .container {
      max-width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 10px 30px;
    }
  }
`;