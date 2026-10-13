#!/usr/bin/env python3
"""Rebuild the two-page document guide while preserving its original design.

Run from any working directory:
    python3 scripts/generate-document-guide.py
Requires ReportLab. Uses the bundled OFL Japanese font in dist/assets/fonts.
The invoice rows and total are read from dist/expenses-guide.html so this
example cannot silently drift from the website's authoritative example.
Other guide wording, pagination, links and the source-check date are preserved.
"""

from html.parser import HTMLParser
from pathlib import Path
import argparse
import re

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "dist/assets/fonts/NotoSansJP-Regular.ttf"
DEFAULT_OUTPUT = ROOT / "dist/downloads/document-guide.pdf"


class InvoiceParser(HTMLParser):
    """Read only the existing invoice sample, not other prices on the page."""

    def __init__(self):
        super().__init__()
        self.depth = 0
        self.in_table = False
        self.in_cell = False
        self.in_total = False
        self.row = []
        self.rows = []
        self.cell = ""
        self.total = ""

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "div" and "document-sample" in classes:
            if self.depth:
                raise ValueError("Nested invoice sample is unsupported")
            self.depth = 1
        elif self.depth and tag == "div":
            self.depth += 1
        if not self.depth:
            return
        if tag == "table":
            self.in_table = True
        if self.in_table and tag == "tr":
            self.row = []
        if self.in_table and tag in ("td", "th"):
            self.in_cell = True
            self.cell = ""
        if tag == "p" and "bill-total" in classes:
            self.in_total = True

    def handle_endtag(self, tag):
        if not self.depth:
            return
        if tag in ("td", "th") and self.in_cell:
            self.row.append(self.cell.strip())
            self.in_cell = False
        if tag == "tr" and self.in_table:
            self.rows.append(self.row)
        if tag == "table":
            self.in_table = False
        if tag == "p":
            self.in_total = False
        if tag == "div":
            self.depth -= 1

    def handle_data(self, data):
        if self.in_cell:
            self.cell += data
        if self.in_total:
            self.total += data


def read_invoice():
    parser = InvoiceParser()
    parser.feed((ROOT / "dist/expenses-guide.html").read_text(encoding="utf-8"))
    if len(parser.rows) != 4 or any(len(row) != 3 for row in parser.rows):
        raise ValueError("Expected one header and three invoice rows")
    rows = parser.rows[1:]
    if parser.rows[0] != ["実施した業務", "数量", "金額（税込）"]:
        raise ValueError("Invoice columns changed; review the PDF layout")
    amounts = []
    for row in rows:
        if not re.fullmatch(r"[0-9,]+円", row[2]):
            raise ValueError(f"Unexpected invoice amount: {row[2]}")
        amounts.append(int(row[2].replace(",", "").removesuffix("円")))
    total_match = re.fullmatch(r"合計\s*([0-9,]+)円", parser.total.strip())
    if not total_match or int(total_match[1].replace(",", "")) != sum(amounts):
        raise ValueError("The website invoice total does not match its line items")
    return rows, f"{sum(amounts):,}円"


# Each line is (x, baseline from top, font size, color, text).
# Explicit line breaks preserve the reviewed A4 pagination and Japanese wrapping.
PAGE_TEXT = [
    [
        (42.0, 814.89, 8.0, '#5c636b', '広報担当さん / ソラグリップ   確認日：2026年10月9日'),
        (548.836, 814.89, 8.0, '#5c636b', '1'),
        (48.0, 66.0, 20.0, '#17191b', '請求書・領収書と'),
        (48.0, 95.0, 20.0, '#17191b', '業務記録の整え方'),
        (48.0, 126.0, 9.0, '#5c636b', '政務活動費への充当を保証するものではありません。'),
        (48.0, 150.0, 11.0, '#17191b', 'ご契約前に動画の目的・依頼者・支払者・対象期間を確認し、見積書・契約書・請求書・領収書と納'),
        (48.0, 167.5, 11.0, '#17191b', '品記録を、実際の業務に沿って整えます。'),
        (48.0, 195.0, 11.0, '#17191b', '当サービスの請求書があれば政務活動費で支払える、というものではありません。選挙運動の費用を'),
        (48.0, 212.5, 11.0, '#17191b', '政務活動費用に書き換えるなど、実態と異なる書類は作成しません。税務上の経費処理と、政務活動'),
        (48.0, 230.0, 11.0, '#17191b', '費への充当可否も別の問題です。'),
        (48.0, 260.5, 14.0, '#17191b', '契約から保存まで'),
        (48.0, 292.5, 14.0, '#17191b', '1. 契約前'),
        (48.0, 321.5, 11.0, '#17191b', '動画の目的・内容・公開先、依頼者と支払者、利用予定の費目を整理し、お客様から所属議会事務局'),
        (48.0, 339.0, 11.0, '#17191b', 'に適用基準と必要書類を確認。'),
        (48.0, 369.5, 14.0, '#17191b', '2. 見積・合意'),
        (48.0, 398.5, 11.0, '#17191b', '企画、撮影、編集、運用支援、出張費などの実際の作業と金額を明記。複数用途がある場合は対象部'),
        (48.0, 416.0, 11.0, '#17191b', '分を説明できる内訳にします。'),
        (48.0, 446.5, 14.0, '#17191b', '3. 制作・納品'),
        (48.0, 475.5, 11.0, '#17191b', '実施日、テーマ、本数、納品日・公開URLなどを記録。内容の確認・承認記録も残します。'),
        (48.0, 506.0, 14.0, '#17191b', '4. 請求・保存'),
        (48.0, 535.0, 11.0, '#17191b', '実態に一致した宛名・但し書き・明細で請求し、銀行振込後に領収書を発行。お客様は振込記録と成'),
        (48.0, 552.5, 11.0, '#17191b', '果物も合わせて保存します。'),
        (48.0, 583.0, 14.0, '#17191b', '所属議会への確認'),
        (48.0, 612.0, 11.0, '#17191b', '政務活動費の対象は所属議会の条例・手引きによって異なります。千葉県議会の手引きは、議会活動'),
        (48.0, 629.5, 11.0, '#17191b', 'や県政に関する広報を対象とし、政務活動以外の内容が混在する場合には実態に応じた按分を求めて'),
        (48.0, 647.0, 11.0, '#17191b', 'います。YouTube動画制作や運用支援、保管のみの費用が対象になるかは、具体的な内容ごとに所属'),
        (48.0, 664.5, 11.0, '#17191b', '議会事務局へ確認します。'),
        (48.0, 690.0, 9.0, '#5c636b', '動画データの保管期間と、会計・政務活動費の証拠書類の保存期間は別です。必要書類はお客様側でも、適用される期間に'),
        (48.0, 704.0, 9.0, '#5c636b', '従って保管してください。'),
    ],
    [
        (42.0, 814.89, 8.0, '#5c636b', '広報担当さん / ソラグリップ   確認日：2026年10月9日'),
        (548.836, 814.89, 8.0, '#5c636b', '2'),
        (48.0, 66.0, 20.0, '#17191b', '請求書の記載例'),
        (48.0, 97.0, 9.0, '#5c636b', '架空の例です。実際の契約・作業に合わせて作成します。'),
        (48.0, 121.0, 11.0, '#17191b', '宛名：○○議員 様'),
        (48.0, 138.5, 11.0, '#17191b', '件名：○年○月 活動報告動画制作'),
        (48.0, 156.0, 11.0, '#17191b', '対象期間：○年○月○日〜○月○日'),
        (48.0, 173.5, 11.0, '#17191b', '発行者：ソラグリップ（広報担当さん）'),
        (48.0, 209.0, 9.0, '#5c636b', '実施した業務'),
        (421.276, 209.0, 9.0, '#5c636b', '数量'),
        (469.276, 209.0, 9.0, '#5c636b', '税込金額'),
        (48.0, 407.2, 14.0, '#17191b', '領収書の但し書きの例'),
        (48.0, 436.2, 11.0, '#17191b', '○年○月 活動報告動画制作代金として（請求書番号○○のとおり）'),
        (48.0, 463.7, 11.0, '#17191b', '宛名・支払者・入金日・金額を一致させ、納品一覧に動画タイトル・納品日・ファイル名または公開'),
        (48.0, 481.2, 11.0, '#17191b', 'URLを記載します。領収書は入金確認後に発行します。'),
        (48.0, 506.7, 9.0, '#5c636b', '千葉県議会の手引きでは、領収書に発行日・宛名・金額・支払対象・発行者名・発行者の印が原則必要です。宛名は会派名・'),
        (48.0, 520.7, 9.0, '#5c636b', '議員名を基本に、契約者・実際の支払者との整合を確認します。他の議会では基準が異なるため、書式や電子データの扱い'),
        (48.0, 534.7, 9.0, '#5c636b', 'を確認します。'),
        (48.0, 562.7, 14.0, '#17191b', 'インボイス登録について'),
        (48.0, 589.7, 9.0, '#5c636b', '適格請求書発行事業者として登録していないため、適格請求書は発行できません。通常の請求書・領収書は発行します。料'),
        (48.0, 603.7, 9.0, '#5c636b', '金は税込表示です。'),
        (48.0, 631.7, 14.0, '#17191b', '公的資料'),
        (48.0, 658.7, 9.0, '#5c636b', '1. '),
        (57.513, 658.7, 9.0, '#925000', '千葉県議会｜政務活動費 [公式資料を開く]'),
        (48.0, 680.7, 9.0, '#5c636b', '2. '),
        (57.513, 680.7, 9.0, '#925000', '千葉県議会｜政務活動費の手引き（2026年4月） [公式資料を開く]'),
        (48.0, 702.7, 9.0, '#5c636b', '3. '),
        (57.513, 702.7, 9.0, '#925000', '国税庁｜インボイス制度Q&A 適格請求書発行事業者の義務等 [公式資料を開く]'),
    ],
]

SOURCE_LINKS = [
    (57.513, 649.700, 227.613, 660.500,
     "https://www.pref.chiba.lg.jp/gikai/soumu/seimukatudouhi/index.html"),
    (57.513, 671.700, 324.588, 682.500,
     "https://www.pref.chiba.lg.jp/gikai/soumu/seimukatudouhi/documents/r80401tebiki.pdf"),
    (57.513, 693.700, 373.899, 704.500,
     "https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/pdf/qa/01-06.pdf"),
]


def draw_text(pdf, x, top, size, color, text, max_width=None):
    if max_width is not None and pdfmetrics.stringWidth(text, "GuideJapanese", size) > max_width:
        raise ValueError(f"Invoice cell needs a reviewed layout update: {text}")
    missing = [ch for ch in text if ord(ch) not in pdfmetrics.getFont("GuideJapanese").face.charToGlyph]
    if missing:
        raise ValueError(f"Font lacks characters: {missing}")
    pdf.setFillColor(HexColor(color))
    pdf.setFont("GuideJapanese", size)
    pdf.drawString(x, A4[1] - top, text)


def generate(output):
    rows, total = read_invoice()
    pdfmetrics.registerFont(TTFont("GuideJapanese", str(FONT)))
    output.parent.mkdir(parents=True, exist_ok=True)
    # invariant=True makes repeated builds byte-for-byte reproducible.
    pdf = canvas.Canvas(str(output), pagesize=A4, invariant=True, pageCompression=1)
    pdf.setTitle("document-guide.pdf")
    pdf.setAuthor("ソラグリップ / 広報担当さん")
    pdf.setCreator("scripts/generate-document-guide.py")
    for number, lines in enumerate(PAGE_TEXT, start=1):
        pdf.setStrokeColor(HexColor("#dce0e4"))
        pdf.setLineWidth(1)
        pdf.line(42, 42, A4[0] - 42, 42)
        if number == 2:
            left, right = 42, A4[0] - 42
            pdf.setFillColor(HexColor("#f5f6f7"))
            pdf.rect(left, A4[1] - 224, right - left, 34, stroke=0, fill=1)
            pdf.setStrokeColor(HexColor("#dce0e4"))
            pdf.setLineWidth(0.4)
            pdf.setLineCap(1)
            pdf.setLineJoin(1)
            for y in (190, 224, 259.8, 295.6, 331.4, 367.2):
                pdf.line(left, A4[1] - y, right, A4[1] - y)
            for x in (left, right - 138, right - 90, right):
                pdf.line(x, A4[1] - 190, x, A4[1] - 367.2)
        for line in lines:
            draw_text(pdf, *line)
            if number == 2 and line[-1] == "税込金額":
                for row_index, row in enumerate(rows):
                    y = 244.1 + 35.8 * row_index
                    for value, x, width in zip(row, (48, right - 132, right - 84), (361.275, 36, 78)):
                        draw_text(pdf, x, y, 10.1, "#17191b", value, max_width=width)
                draw_text(pdf, 48, 351.5, 10.1, "#17191b", "合計")
                draw_text(pdf, right - 84, 351.5, 10.1, "#17191b", total, max_width=78)
        if number == 2:
            for x1, y1, x2, y2, uri in SOURCE_LINKS:
                pdf.linkURL(uri, (x1, A4[1] - y2, x2, A4[1] - y1), relative=0)
        pdf.showPage()
    pdf.save()
    print(f"Generated {output}: 2 pages; invoice total {total}")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    generate(cli.parse_args().output.resolve())
