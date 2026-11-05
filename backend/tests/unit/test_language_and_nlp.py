import pytest
from app.pipelines.language_detection.detector import LanguageDetector
from app.integrations.translation_provider.indictrans2 import get_translation_service
from app.pipelines.nlp.nltk_processor import NLTKProcessor


def test_language_detection():
    eng_text = "This is an official government revenue record under the Land Acquisition Act."
    lang_eng, dist_eng = LanguageDetector.detect(eng_text)
    assert lang_eng == "eng"
    assert dist_eng["eng"] > 0.5

    guj_text = "આ એક સત્તાવાર મહેસૂલ હુકમ છે જે સાણંદ તાલુકા કચેરી દ્વારા જારી કરવામાં આવ્યો છે."
    lang_guj, dist_guj = LanguageDetector.detect(guj_text)
    assert lang_guj == "guj"
    assert dist_guj["guj"] > 0.15

    hin_text = "यह एक आधिकारिक राजस्व आदेश है जो भूमि अधिग्रहण से संबंधित है।"
    lang_hin, dist_hin = LanguageDetector.detect(hin_text)
    assert lang_hin == "hin"
    assert dist_hin["hin"] > 0.15


def test_english_bypass_and_indictrans2_interface():
    trans_svc = get_translation_service()

    # English bypass must be explicit
    eng_text = "Official record dated 15th October 2023."
    out_text, method, meta = trans_svc.translate_to_english(eng_text, "eng")
    assert method == "english_bypass"
    assert out_text == eng_text
    assert meta["bypassed"] is True

    # IndicTrans2 status must provide honest report
    status = trans_svc.get_service_status()
    assert "name" in status
    assert "supported_routes" in status
    assert "eng (bypass)" in status["supported_routes"]


def test_nltk_processor():
    sample = "The Deputy Collector examined the register. He noticed a discrepancy in Parcel 412. An inquiry was ordered."
    res = NLTKProcessor.process_document_text(sample)
    assert res["sentence_count"] == 3
    assert res["word_count"] > 10
    assert len(res["sentences"]) == 3
