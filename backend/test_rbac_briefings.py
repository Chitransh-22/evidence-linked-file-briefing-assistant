import requests

BASE = 'http://localhost:8000/api/v1'

def run_tests():
    # 1. Login
    inv_res = requests.post(f'{BASE}/auth/login', json={'username': 'investigator', 'password': 'OfficerGov2026!'})
    print('1. Investigator Login:', inv_res.status_code)
    inv_tok = inv_res.json().get('access_token')

    adm_res = requests.post(f'{BASE}/auth/login', json={'username': 'admin', 'password': 'AdminSecureGov2026!'})
    print('2. Admin Login:', adm_res.status_code)
    adm_tok = adm_res.json().get('access_token')

    rev_res = requests.post(f'{BASE}/auth/login', json={'username': 'reviewer', 'password': 'OfficerGov2026!'})
    print('3. Reviewer Login:', rev_res.status_code)
    rev_tok = rev_res.json().get('access_token')

    # 4. List briefings as investigator
    list_res = requests.get(f'{BASE}/briefings', headers={'Authorization': f'Bearer {inv_tok}'})
    print('4. List briefings as investigator:', list_res.status_code)
    items = list_res.json().get('items', [])
    print(f'   Total briefings returned: {len(items)}')
    for item in items:
        has_sec = 'section_data' in item and len(item.get('section_data', {})) > 0
        print(f"   - {item['_id']}: {item.get('title')} (has section_data: {has_sec})")

    # 5. Get briefing preview as investigator for each briefing
    for item in items:
        b_id = item['_id']
        get_res = requests.get(f'{BASE}/briefings/{b_id}', headers={'Authorization': f'Bearer {inv_tok}'})
        print(f'5. Get briefing {b_id} as investigator: status={get_res.status_code}')
        if get_res.status_code == 200:
            data = get_res.json()
            brf = data.get('briefing', {})
            sec_data = brf.get('section_data', {})
            print(f'   Preview OK! Sections count: {len(sec_data)}, Keys: {list(sec_data.keys())[:3]}...')
        else:
            print(f'   FAILED: {get_res.text}')

    # 6. Test PDF export as investigator
    if items:
        b_id = items[0]['_id']
        pdf_res = requests.get(f'{BASE}/briefings/{b_id}/export/pdf', headers={'Authorization': f'Bearer {inv_tok}'})
        print(f'6. PDF Export for {b_id} as investigator: status={pdf_res.status_code}, bytes={len(pdf_res.content)}')

    # 7. Test DOCX export as investigator
    if items:
        b_id = items[0]['_id']
        docx_res = requests.get(f'{BASE}/briefings/{b_id}/export/docx', headers={'Authorization': f'Bearer {inv_tok}'})
        print(f'7. DOCX Export for {b_id} as investigator: status={docx_res.status_code}, bytes={len(docx_res.content)}')

    # 8. Test separation of duties: investigator cannot self-approve
    if items:
        b_id = items[0]['_id']
        appr_res = requests.post(f'{BASE}/briefings/{b_id}/approve', headers={'Authorization': f'Bearer {inv_tok}'})
        print(f"8. Investigator self-approve check (should be 403): status={appr_res.status_code}, detail={appr_res.json().get('detail')}")

    # 9. Test patch/save draft as investigator
    if items:
        b_id = items[0]['_id']
        patch_res = requests.patch(f'{BASE}/briefings/{b_id}', json={
            'title': items[0].get('title'),
            'change_note': 'Test verification edit by investigator',
        }, headers={'Authorization': f'Bearer {inv_tok}'})
        print(f'9. Patch briefing as investigator: status={patch_res.status_code}')

    print('\nALL VERIFICATION CHECKS COMPLETED.')

if __name__ == '__main__':
    run_tests()
