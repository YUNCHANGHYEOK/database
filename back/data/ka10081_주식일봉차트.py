import requests
import json


# 키움증권 API 설정 (모의투자용)
access_params = {
    'grant_type': 'client_credentials',
    'appkey': 'O3kJjNLr_qpv4UaI_dlJcu4NZf_8Q4AIGXMu2UZr5WE',
    'secretkey': 'AVTWCe2Wi6h4HX3q3oly0FN2Gq5VsvWNz_W7M9c0kNY',
}

print("=== 키움증권 API 토큰 발급 시도 ===")

try:
    response = requests.post('https://mockapi.kiwoom.com/oauth2/token', json=access_params)
    response_text = response.text
    
    print(f"API 응답 상태 코드: {response.status_code}")
    
    json_start_index = response_text.find('{')
    if json_start_index == -1:
        raise ValueError("응답에서 JSON 형식을 찾을 수 없습니다.")
    
    json_string = response_text[json_start_index:]
    data = json.loads(json_string)
    
    if 'access_token' in data:
        access_token = data['access_token']
        print(f"✅ 토큰 획득 성공")
    elif 'token' in data:
        access_token = data['token']
        print(f"✅ 토큰 획득 성공")
    else:
        print(f"❌ 토큰을 찾을 수 없습니다.")
        raise KeyError("토큰 키를 찾을 수 없습니다.")

except Exception as e:
    print(f"❌ 오류 발생: {e}")
    exit(1)


# ============================================================================
# ka10081: 주식일봉차트
# ============================================================================

def fn_ka10081(token, data, cont_yn='N', next_key=''):
    """
    ka10081 - 주식일봉차트 조회
    
    Parameters:
        token: 인증 토큰
        data: 요청 데이터 (예: {'stk_cd': '005930', 'base_dt': '20251116', 'upd_stkpc_tp': '1'})
              - stk_cd: 종목코드
              - base_dt: 기준일자 (YYYYMMDD)
              - upd_stkpc_tp: 수정주가구분 (0: 미적용, 1: 적용)
        cont_yn: 연속조회 여부 ('N' 또는 'Y')
        next_key: 연속조회 키
    
    Returns:
        API 응답 결과 (dict)
    """
    host = 'https://mockapi.kiwoom.com'
    endpoint = '/api/dostk/chart'
    url = host + endpoint

    headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': f'Bearer {token}',
        'cont-yn': cont_yn,
        'next-key': next_key,
        'api-id': 'ka10081',
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        result = response.json()
        
        print(f'\n=== ka10081 (주식일봉차트) 결과 ===')
        print(f'상태 코드: {response.status_code}')
        print(f'응답 결과:')
        print(json.dumps(result, indent=4, ensure_ascii=False))
        
        if result.get('return_code') == 0:
            print(f'\n✅ 조회 성공!')
            if 'stk_dt_pole_chart_qry' in result:
                print(f'   일봉 데이터 개수: {len(result["stk_dt_pole_chart_qry"])}개')
                if len(result['stk_dt_pole_chart_qry']) > 0:
                    print(f'   첫 번째 데이터: {result["stk_dt_pole_chart_qry"][0]}')
        else:
            print(f'\n❌ 조회 실패: {result.get("return_msg")}')
        
        return result
    
    except Exception as e:
        print(f'❌ 오류 발생: {e}')
        return None


# ============================================================================
# 실행 구간
# ============================================================================
if __name__ == '__main__':
    MY_ACCESS_TOKEN = access_token
    
    print("\n" + "="*70)
    print("📊 ka10081 - 주식일봉차트 조회")
    print("="*70)
    
    # 삼성전자 10일 조회 (오늘 날짜 기준)
    from datetime import datetime
    today = datetime.now().strftime('%Y%m%d')
    
    print(f"\n[1] 삼성전자(005930) 기준일자 {today} 일봉 조회")
    result = fn_ka10081(
        token=MY_ACCESS_TOKEN,
        data={
            'stk_cd': '005930',
            'base_dt': today,  # 오늘 날짜
            'upd_stkpc_tp': '1'  # 수정주가 적용
        }
    )
    
    print("\n" + "="*70)
    print("✅ 조회 완료")
    print("="*70)
    print("\n📌 참고:")
    print("  - ka10081: 주식일봉차트 조회")
    print("  - 응답 필드: stk_dt_pole_chart_qry")
    print("  - 엔드포인트: /api/dostk/chart")
