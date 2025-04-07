import pytest
from receiptservice import create_app
from pathlib import Path
import io
from werkzeug.datastructures import FileStorage
from Receipt import ReceiptEncoder
from dateutil import utils

@pytest.fixture(scope='session')
def app_client():
    flask_app = create_app()
    flask_app.json_encoder = ReceiptEncoder

    with flask_app.app_context():
        with flask_app.test_client() as client:
            yield client


def load_images(images_dir):
    images = {}

    for image_file in images_dir.iterdir():
        if image_file.is_file():
            with open(image_file, 'rb') as f:
                file_storage = FileStorage(
                    stream=io.BytesIO(f.read()),
                    filename=image_file.name,
                    content_type=f"image/{image_file.suffix.lstrip('.')}"
                )
                images[image_file.name] = file_storage

    return images


@pytest.fixture(scope="module")
def receipt_images():
    paths = ['media/receipts_images', 'media/receipts_pdfs']
    images = {}

    for path in paths:
        images_dir = Path(__file__).parent / path
        images.update(load_images(images_dir))

    return images


@pytest.fixture(scope="module")
def non_receipt_images():
    images_dir = Path(__file__).parent / 'media/non-receipts_images'
    return load_images(images_dir)


@pytest.fixture(scope='session')
def receipt_image_ans():
    ans_dict = {
        'food1.jpeg': {
            'merchant_name': 'FOOD REPUBLIC PTE LT',
            "date": "23/09/2022",
            "total_cost": "26.00",
            "category": "FOOD",
        },
        'transport1.jpg': {
            "merchant_name": "Shell",
            "date": utils.today().date().strftime("%d/%m/%Y"), # No date was given, will be the current date
            "total_cost": "31.92",
            "category": "TRANSPORT",
        },
        'transport2.JPG': {
            "merchant_name": "CITYCAB PTE LTD",
            "date": "30/10/2018",
            "total_cost": "70.75",
            "category": "TRANSPORT",
        },
        'healthcare1.jpg': {
            "merchant_name": "Changi General Hospital",
            "date": "21/06/2019",
            "total_cost": "37.00",
            "category": "HEALTHCARE",
        },
        'leisure1.jpg': {
            "merchant_name": "GOLD CLASS",
            "date": "18/12/2022",
            "total_cost": "94.00",
            "category": "LEISURE"
        },
        'clothing1.jpg': {
            "merchant_name": "LIMITED EDT",
            "date": "02/04/2016",
            "total_cost": "289.00",
            "category": "CLOTHING"
        },
        'housing1.jpg': {
            "merchant_name": "Ambassador Transit Hotel T2",
            "date": "01/05/2018",
            "total_cost": "175.00",
            "category": "HOUSING",
        },
        'electronics_single_page_test1.pdf': {
            "merchant_name": "SuperStore",
            "date": "14/02/2012",
            "total_cost": "5403.47",
            "category": "OTHERS"
        },
        'insurance_multi_page_test1.pdf': {
            "merchant_name": "META\nLEGAL & FINANCE",
            "date": "12/03/2024",
            "total_cost": "5715.00",
            "category": "OTHERS"
        },
    }

    return ans_dict
