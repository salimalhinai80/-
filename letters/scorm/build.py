#!/usr/bin/env python3
"""يبني حزمتي SCORM 1.2 و SCORM 2004 للعبة «مغامرة إنقاذ مملكة الحروف».

التشغيل من أي مكان:  python3 letters/scorm/build.py
الناتج: letters/scorm/mamlakat-alhuruf-scorm12.zip و mamlakat-alhuruf-scorm2004.zip
"""
import os
import zipfile
from xml.sax.saxutils import escape

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # مجلد letters
TITLE = 'مغامرة إنقاذ مملكة الحروف'
DESC = 'لعبة تعليمية لتعليم الحروف الهجائية العربية الثمانية والعشرين لطلبة الصف الأول الأساسي'
ID = 'mamlakat_alhuruf'

INCLUDE_DIRS = ['css', 'js', 'fonts', 'vendor', 'audio']
INCLUDE_FILES = ['index.html']


def collect():
    files = list(INCLUDE_FILES)
    for d in INCLUDE_DIRS:
        for base, _, names in os.walk(os.path.join(ROOT, d)):
            for n in sorted(names):
                if n.startswith('.'):
                    continue
                files.append(os.path.relpath(os.path.join(base, n), ROOT).replace(os.sep, '/'))
    return files


def file_tags(files):
    return '\n'.join('      <file href="%s"/>' % escape(f) for f in files)


def manifest_12(files):
    return '''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="%(id)s_12" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org_%(id)s">
    <organization identifier="org_%(id)s">
      <title>%(title)s</title>
      <item identifier="item_%(id)s" identifierref="res_%(id)s" isvisible="true">
        <title>%(title)s</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_%(id)s" type="webcontent" adlcp:scormtype="sco" href="index.html">
%(files)s
    </resource>
  </resources>
</manifest>
''' % {'id': ID, 'title': escape(TITLE), 'files': file_tags(files)}


def manifest_2004(files):
    return '''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="%(id)s_2004" version="1"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="org_%(id)s">
    <organization identifier="org_%(id)s">
      <title>%(title)s</title>
      <item identifier="item_%(id)s" identifierref="res_%(id)s" isvisible="true">
        <title>%(title)s</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_%(id)s" type="webcontent" adlcp:scormType="sco" href="index.html">
%(files)s
    </resource>
  </resources>
</manifest>
''' % {'id': ID, 'title': escape(TITLE), 'files': file_tags(files)}


def build(name, manifest, files):
    out = os.path.join(HERE, name)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('imsmanifest.xml', manifest)
        for f in files:
            z.write(os.path.join(ROOT, f), f)
    print('%s  (%d ملفاً، %d كيلوبايت)' % (out, len(files) + 1, os.path.getsize(out) // 1024))


if __name__ == '__main__':
    fs = collect()
    build('mamlakat-alhuruf-scorm12.zip', manifest_12(fs), fs)
    build('mamlakat-alhuruf-scorm2004.zip', manifest_2004(fs), fs)
