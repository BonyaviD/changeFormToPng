import type { CSSProperties, ReactNode } from "react";

import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/persian";

import type { ArtworkContext } from "../types";
import {
  ASSETS,
  BODY,
  CANVAS,
  HEADER,
  META_BLOCK,
  PAPER,
  PRIMARY_SIGNATORY,
  QR,
  SIGNATURE,
  TITLE_BLOCK,
} from "./layout";
import { ATTENDANCE_LABEL, HONORIFIC, type HalalTrainingValues } from "./schema";

/* -------------------------------------------------------------------------- */
/* Positioning primitives                                                      */
/* -------------------------------------------------------------------------- */

/** A box anchored by its horizontal centre — how most blocks are placed here. */
function CentredBlock({
  centreX,
  top,
  width,
  children,
  style,
}: {
  centreX: number;
  top: number;
  width: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: centreX - width / 2,
        top,
        width,
        textAlign: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

function HeaderColumn({
  centreX,
  logo,
  logoWidth,
  organisation,
  unit,
}: {
  centreX: number;
  logo: string;
  logoWidth: number;
  organisation: string;
  unit: string;
}) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: centreX - logoWidth / 2,
          top: HEADER.logoTop,
          width: logoWidth,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" style={{ width: "100%", display: "block" }} />
      </div>
      <CentredBlock
        centreX={centreX}
        top={HEADER.captionTop}
        width={HEADER.captionWidth}
        style={{
          fontSize: HEADER.captionFontSize,
          lineHeight: `${HEADER.captionLineHeight}px`,
        }}
      >
        <div>{organisation}</div>
        <div>{unit}</div>
      </CentredBlock>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Signature                                                                   */
/* -------------------------------------------------------------------------- */

function SignatureBlock({
  centreX,
  name,
  title,
  withInk,
}: {
  centreX: number;
  name: string;
  title: string;
  withInk: boolean;
}) {
  return (
    <>
      {withInk ? (
        <div
          style={{
            position: "absolute",
            left: centreX - SIGNATURE.image.width / 2 + SIGNATURE.image.offsetX,
            top: SIGNATURE.nameTop + SIGNATURE.image.offsetY,
            width: SIGNATURE.image.width,
            transform: `rotate(${SIGNATURE.image.rotation}deg)`,
            transformOrigin: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.signature} alt="" style={{ width: "100%", display: "block" }} />
        </div>
      ) : null}

      <CentredBlock
        centreX={centreX}
        top={SIGNATURE.nameTop}
        width={SIGNATURE.blockWidth}
        style={{ fontSize: SIGNATURE.nameFontSize, lineHeight: "36px" }}
      >
        {name}
      </CentredBlock>
      <CentredBlock
        centreX={centreX}
        top={SIGNATURE.titleTop}
        width={SIGNATURE.blockWidth}
        style={{ fontSize: SIGNATURE.titleFontSize, lineHeight: "32px" }}
      >
        {title}
      </CentredBlock>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Artwork                                                                     */
/* -------------------------------------------------------------------------- */

export function HalalTrainingArtwork({
  values,
  context,
}: {
  values: HalalTrainingValues;
  context: ArtworkContext;
}) {
  const honorific = HONORIFIC[values.gender] ?? "";
  const attendance = ATTENDANCE_LABEL[values.attendance] ?? "";
  const duration = values.duration?.trim();

  return (
    <div
      className="certificate-surface"
      style={{
        position: "relative",
        width: CANVAS.width,
        height: CANVAS.height,
        direction: "rtl",
        fontFamily: "var(--font-nastaliq)",
        fontFeatureSettings: '"ss01"',
        overflow: "hidden",
      }}
    >
      {/* Ornamental border, full bleed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ASSETS.frame}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
        }}
      />

      {/* The paper the text sits on. */}
      <div
        style={{
          position: "absolute",
          left: PAPER.x,
          top: PAPER.y,
          width: PAPER.width,
          height: PAPER.height,
          backgroundColor: "#ffffff",
        }}
      />

      {/* --- Header ---------------------------------------------------- */}
      <HeaderColumn
        centreX={HEADER.columns.right}
        logo={ASSETS.logoFda}
        logoWidth={HEADER.fdaLogoWidth}
        organisation="سازمان غذا و دارو"
        unit="اداره کل امور دارو و مواد تحت کنترل"
      />

      <div
        style={{
          position: "absolute",
          left: HEADER.columns.centre - HEADER.emblem.width / 2,
          top: HEADER.emblem.top,
          width: HEADER.emblem.width,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.emblem}
          alt="جمهوری اسلامی ایران"
          style={{ width: "100%", display: "block" }}
        />
      </div>

      <HeaderColumn
        centreX={HEADER.columns.left}
        logo={ASSETS.logoHalal}
        logoWidth={HEADER.halalLogoWidth}
        organisation="سازمان غذا و دارو"
        unit="مرکز تحقیقات حلال جمهوری اسلامی ایران"
      />

      {/* --- Title -------------------------------------------------------- */}
      <CentredBlock
        centreX={TITLE_BLOCK.centreX}
        top={TITLE_BLOCK.top}
        width={TITLE_BLOCK.width}
        style={{ fontSize: TITLE_BLOCK.fontSize, fontWeight: 700 }}
      >
        بسم تعالی
      </CentredBlock>
      <CentredBlock
        centreX={TITLE_BLOCK.centreX}
        top={TITLE_BLOCK.top + TITLE_BLOCK.lineGap}
        width={TITLE_BLOCK.width}
        style={{ fontSize: TITLE_BLOCK.fontSize, fontWeight: 700 }}
      >
        گواهی پایان دوره آموزشی
      </CentredBlock>

      {/* --- Serial and issue date ---------------------------------------- */}
      <CentredBlock
        centreX={META_BLOCK.centreX}
        top={META_BLOCK.top}
        width={META_BLOCK.width}
        style={{ fontSize: META_BLOCK.fontSize }}
      >
        {`شماره: ${toPersianDigits(values.courseCode)}`}
      </CentredBlock>
      <CentredBlock
        centreX={META_BLOCK.centreX}
        top={META_BLOCK.top + META_BLOCK.lineGap}
        width={META_BLOCK.width}
        style={{ fontSize: META_BLOCK.fontSize }}
      >
        {`تاریخ صدور: ${formatJalali(values.issueDate)}`}
      </CentredBlock>

      {/* --- Body --------------------------------------------------------- */}
      <div
        style={{
          position: "absolute",
          left: BODY.x,
          top: BODY.top,
          width: BODY.width,
          height: BODY.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: BODY.fontSize,
          lineHeight: `${BODY.lineHeight}px`,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0 }}>
        بدینوسیله گواهی می‌شود {honorific}{" "}
        <strong style={{ fontWeight: 700 }}>{values.fullName}</strong> فرزند{" "}
        <strong style={{ fontWeight: 700 }}>{values.fatherName}</strong> دارای کد ملی{" "}
        <strong style={{ fontWeight: 700 }}>{toPersianDigits(values.nationalId)}</strong> در
        دوره آموزشی{" "}
        <strong style={{ fontWeight: 700 }}>{values.courseTitle}</strong> که در تاریخ{" "}
        {formatJalali(values.heldDate)} به صورت {attendance}
        {duration ? ` و به مدت ${toPersianDigits(duration)}` : ""} برگزار گردیده شرکت و
        دوره را با موفقیت به پایان رسانیده است.
        </p>
      </div>

      {/* --- Signatures --------------------------------------------------- */}
      {values.dualSignature ? (
        <>
          <SignatureBlock
            centreX={SIGNATURE.dualCentreX.primary}
            name={PRIMARY_SIGNATORY.name}
            title={PRIMARY_SIGNATORY.title}
            withInk
          />
          <SignatureBlock
            centreX={SIGNATURE.dualCentreX.secondary}
            name={values.secondSignatoryName || ""}
            title={values.secondSignatoryTitle || ""}
            withInk={false}
          />
        </>
      ) : (
        <SignatureBlock
          centreX={SIGNATURE.soloCentreX}
          name={PRIMARY_SIGNATORY.name}
          title={PRIMARY_SIGNATORY.title}
          withInk
        />
      )}

      {/* --- Verification QR ---------------------------------------------- */}
      {context.qrDataUrl ? (
        <>
          <div
            style={{
              position: "absolute",
              left: QR.x,
              top: QR.y,
              width: QR.size,
              height: QR.size,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={context.qrDataUrl}
              alt="کد استعلام"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
          <CentredBlock
            centreX={QR.x + QR.size / 2}
            top={QR.captionTop}
            width={200}
            style={{ fontSize: QR.captionFontSize, lineHeight: "20px" }}
          >
            {context.serial ? toPersianDigits(context.serial) : "کد استعلام"}
          </CentredBlock>
        </>
      ) : null}
    </div>
  );
}
