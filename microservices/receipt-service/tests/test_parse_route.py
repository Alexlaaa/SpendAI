import io


def test_missing_file_param(app_client):
    # Missing file
    response = app_client.post('/upload', data={
        'defaultModel': 'GEMINI', 'geminiKey': 'test'})
    assert response.status_code == 400
    assert response.json == {'error': 'No file received'}

def test_missing_model_param(app_client):
    # Missing model
    response = app_client.post('/upload', data={
        'file': (io.BytesIO(b'test file content'), 'test_image.jpg'), 'geminiKey': 'test'})

    assert response.status_code == 400
    assert response.json == {'error': 'Missing defaultModel parameter'}


def test_missing_api_key_param(app_client):
    # Missing apiKey
    response = app_client.post('/upload', data={
        'file': (io.BytesIO(b'test file content'), 'test_image.jpg'), 'defaultModel': 'GEMINI'})

    assert response.status_code == 400
    assert response.json == {'error': 'Missing geminiKey or openaiKey parameter, at least 1 key is needed'}

    # Missing apiKey
    response = app_client.post('/upload', data={
        'file': (io.BytesIO(b'test file content'), 'test_image.jpg'), 'defaultModel': 'OPENAI'})

    assert response.status_code == 400
    assert response.json == {'error': 'Missing geminiKey or openaiKey parameter, at least 1 key is needed'}

    # UNSET apiKey
    response = app_client.post('/upload', data={
        'file': (io.BytesIO(b'test file content'), 'test_image.jpg'), 'defaultModel': 'OPENAI', 'geminiKey': 'UNSET', 'openaiKey': 'UNSET'})

    assert response.status_code == 400
    assert response.json == {'error': 'Missing geminiKey or openaiKey parameter, at least 1 key is needed'}

    # UNSET apiKey
    response = app_client.post('/upload', data={
        'file': (io.BytesIO(b'test file content'), 'test_image.jpg'), 'defaultModel': 'OPENAI', 'openaiKey': 'UNSET'})

    assert response.status_code == 400
    assert response.json == {'error': 'Missing geminiKey or openaiKey parameter, at least 1 key is needed'}

    # UNSET apiKey
    response = app_client.post('/upload', data={
        'file': (io.BytesIO(b'test file content'), 'test_image.jpg'), 'defaultModel': 'OPENAI', 'geminiKey': 'UNSET'})

    assert response.status_code == 400
    assert response.json == {'error': 'Missing geminiKey or openaiKey parameter, at least 1 key is needed'}
