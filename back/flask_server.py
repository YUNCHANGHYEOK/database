from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)  # CORS 허용

# 키움증권 API 설정
access_params = {
    'grant_type': 'client_credentials',
    'appkey': 'O3kJjNLr_qpv4UaI_dlJcu4NZf_8Q4AIGXMu2UZr5WE',
    'secretkey': 'AVTWCe2Wi6h4HX3q3oly0FN2Gq5VsvWNz_W7M9c0kNY',
}

# 전역 토큰 변수
access_token = None

def get_access_token():
    """키움 API 액세스 토큰 발급"""
    global access_token
    
    try:
        response = requests.post('https://mockapi.kiwoom.com/oauth2/token', json=access_params)
        response_text = response.text
        
        json_start_index = response_text.find('{')
        if json_start_index == -1:
            return None
        
        json_string = response_text[json_start_index:]
        data = json.loads(json_string)
        
        if 'access_token' in data:
            access_token = data['access_token']
        elif 'token' in data:
            access_token = data['token']
        else:
            return None
        
        print(f"✅ 토큰 발급 성공")
        return access_token
    
    except Exception as e:
        print(f"❌ 토큰 발급 실패: {e}")
        return None


def fn_ka10001(token, stk_cd):
    """주식 현재가 조회"""
    host = 'https://mockapi.kiwoom.com'
    endpoint = '/api/dostk/stkinfo'
    url = host + endpoint

    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': f'Bearer {token}',
        'cont-yn': 'N',
        'next-key': '',
        'api-id': 'ka10001',
    }

    try:
        response = requests.post(url, headers=headers, json={'stk_cd': stk_cd})
        result = response.json()
        
        if result.get('return_code') == 0:
            return {
                'success': True,
                'data': result
            }
        else:
            return {
                'success': False,
                'error': result.get('return_msg', '알 수 없는 오류')
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@app.route('/api/stock/<stock_code>', methods=['GET'])
def get_stock_info(stock_code):
    """개별 주식 정보 조회"""
    global access_token
    
    # 토큰이 없으면 발급
    if not access_token:
        access_token = get_access_token()
        if not access_token:
            return jsonify({
                'success': False,
                'error': '토큰 발급 실패'
            }), 500
    
    # 주식 정보 조회
    result = fn_ka10001(access_token, stock_code)
    
    if result['success']:
        data = result['data']
        return jsonify({
            'success': True,
            'stock_code': stock_code,
            'stock_name': data.get('stk_nm', ''),
            'current_price': data.get('cur_prc', '0'),
            'change_price': data.get('pred_pre', '0'),
            'change_rate': data.get('flu_rt', '0'),
            'trading_volume': data.get('trde_qty', '0'),
            'high_price': data.get('high_pric', '0'),
            'low_price': data.get('low_pric', '0'),
            'open_price': data.get('open_pric', '0'),
            'prev_close': data.get('base_pric', '0'),
            'full_data': data
        })
    else:
        return jsonify(result), 400


@app.route('/api/stocks', methods=['GET'])
def get_multiple_stocks():
    """여러 주식 정보 한번에 조회"""
    global access_token
    
    # 기본 종목 코드 리스트
    default_stocks = ['005930', '000660', '035420']  # 삼성전자, SK하이닉스, 네이버
    
    # 쿼리 파라미터로 종목 코드 받기
    stocks_param = request.args.get('stocks', None)
    if stocks_param:
        stock_codes = stocks_param.split(',')
    else:
        stock_codes = default_stocks
    
    # 토큰이 없으면 발급
    if not access_token:
        access_token = get_access_token()
        if not access_token:
            return jsonify({
                'success': False,
                'error': '토큰 발급 실패'
            }), 500
    
    # 각 종목 정보 조회
    stocks_data = []
    for stock_code in stock_codes:
        result = fn_ka10001(access_token, stock_code.strip())
        if result['success']:
            data = result['data']
            stocks_data.append({
                'stock_code': stock_code.strip(),
                'stock_name': data.get('stk_nm', ''),
                'current_price': data.get('cur_prc', '0'),
                'change_price': data.get('pred_pre', '0'),
                'change_rate': data.get('flu_rt', '0'),
                'trading_volume': data.get('trde_qty', '0'),
                'high_price': data.get('high_pric', '0'),
                'low_price': data.get('low_pric', '0'),
                'open_price': data.get('open_pric', '0'),
            })
    
    return jsonify({
        'success': True,
        'count': len(stocks_data),
        'stocks': stocks_data
    })


@app.route('/api/refresh-token', methods=['POST'])
def refresh_token():
    """토큰 강제 재발급"""
    global access_token
    access_token = get_access_token()
    
    if access_token:
        return jsonify({
            'success': True,
            'message': '토큰 재발급 성공'
        })
    else:
        return jsonify({
            'success': False,
            'message': '토큰 재발급 실패'
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'healthy',
        'token_exists': access_token is not None
    })


if __name__ == '__main__':
    print("="*70)
    print("🚀 키움증권 주식 정보 API 서버 시작")
    print("="*70)
    print("📍 서버 주소: http://localhost:5000")
    print("📍 API 엔드포인트:")
    print("   - GET  /api/stock/<종목코드>     : 개별 주식 정보")
    print("   - GET  /api/stocks               : 여러 주식 정보")
    print("   - GET  /api/stocks?stocks=005930,000660  : 지정 종목들")
    print("   - POST /api/refresh-token        : 토큰 재발급")
    print("   - GET  /api/health               : 서버 상태 확인")
    print("="*70)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
