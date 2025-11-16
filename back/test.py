import requests
import json


# 키움증권 API 설정 (모의투자용)
access_params = {
      'grant_type': 'client_credentials',  # grant_type
      'appkey': 'O3kJjNLr_qpv4UaI_dlJcu4NZf_8Q4AIGXMu2UZr5WE',  # 앱키
      'secretkey': 'AVTWCe2Wi6h4HX3q3oly0FN2Gq5VsvWNz_W7M9c0kNY',  # 시크릿키
   }

print("=== 키움증권 API 토큰 발급 시도 ===")

try:
    # 모의투자용 API 엔드포인트 사용
    response = requests.post('https://mockapi.kiwoom.com/oauth2/token', json=access_params)
    response_text = response.text
    
    print(f"API 응답 상태 코드: {response.status_code}")
    print(f"API 응답 전체 내용: {response_text}")
    
    # JSON 시작 부분 찾기
    json_start_index = response_text.find('{')
    if json_start_index == -1:
        raise ValueError("응답에서 JSON 형식을 찾을 수 없습니다.")
    
    json_string = response_text[json_start_index:]
    
    # 2. 잘라낸 JSON 문자열을 파이썬 딕셔너리(Dictionary) 형태로 변환
    data = json.loads(json_string)
    print(f"파싱된 데이터: {data}")
    
    # 3. 응답 구조에 따른 토큰 추출
    if 'access_token' in data:
        access_token = data['access_token']
        print(f"✅ access_token으로 토큰 획득: {access_token[:20]}...")
    elif 'token' in data:
        access_token = data['token']
        print(f"✅ token으로 토큰 획득: {access_token[:20]}...")
    else:
        print(f"❌ 토큰을 찾을 수 없습니다. 사용 가능한 키들: {list(data.keys())}")
        raise KeyError("토큰 키를 찾을 수 없습니다.")

except requests.exceptions.RequestException as e:
    print(f"❌ API 요청 실패: {e}")
    exit(1)
except json.JSONDecodeError as e:
    print(f"❌ JSON 파싱 오류: {e}")
    print(f"응답 내용: {response_text}")
    exit(1)
except Exception as e:
    print(f"❌ 오류 발생: {e}")
    exit(1)



# 주식호가요청
def fn_ka10004(token, data, cont_yn='N', next_key=''):
   # 1. 요청할 API URL (모의투자용으로 변경)
   host = 'https://mockapi.kiwoom.com' # 모의투자
   #host = 'https://api.kiwoom.com' # 실전투자
   endpoint = '/api/dostk/mrkcond'
   url =  host + endpoint

   # 2. header 데이터
   headers = {
      'Content-Type': 'application/json;charset=UTF-8', # 컨텐츠타입
      'authorization': f'Bearer {token}', # 접근토큰
      'cont-yn': cont_yn, # 연속조회여부
      'next-key': next_key, # 연속조회키
      'api-id': 'ka10004', # TR명
   }

   # 3. http POST 요청
   response = requests.post(url, headers=headers, json=data)

   # 4. 응답 상태 코드와 데이터 출력
   print('Code:', response.status_code)
   print('Header:', json.dumps({key: response.headers.get(key) for key in ['next-key', 'cont-yn', 'api-id']}, indent=4, ensure_ascii=False))
   print('Body:', json.dumps(response.json(), indent=4, ensure_ascii=False))  # JSON 응답을 파싱하여 출력

# 실행 구간
if __name__ == '__main__':
   # 1. 토큰 설정
   MY_ACCESS_TOKEN = access_token # 접근토큰

   params = {
      'stk_cd': '005930', # 종목코드 거래소별 종목코드 (KRX:039490,NXT:039490_NX,SOR:039490_AL)
   }

   fn_ka10004(token=MY_ACCESS_TOKEN, data=params, cont_yn='Y', next_key='nextkey..')
   
