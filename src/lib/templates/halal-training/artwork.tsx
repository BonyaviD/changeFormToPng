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
  ORGANISATION,
  PAPER,
  SIGNATURE,
  SIGNATURE_INK,
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

/**
 * One of the two side blocks: a logo with up to two caption lines beneath it.
 *
 * The captions are sized and baselined to match the text baked into the central
 * emblem artwork, so the three blocks read as one header rather than three
 * separately-styled ones.
 */
function HeaderColumn({
  centreX,
  logo,
  logoWidth,
  lines,
}: {
  centreX: number;
  logo: string;
  logoWidth: number;
  lines: string[];
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
          fontFamily: "var(--font-naskh)",
          fontSize: HEADER.captionFontSize,
          lineHeight: `${HEADER.captionLineHeight}px`,
        }}
      >
        {lines.filter(Boolean).map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </CentredBlock>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Signature                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Name, role and scanned signature, all centred on the same axis. The ink is
 * drawn behind the name so it reads as a signature over the printed line.
 */
function SignatureBlock({
  centreX,
  name,
  title,
  signatureImage,
}: {
  centreX: number;
  name: string;
  title: string;
  signatureImage?: string;
}) {
  return (
    <>
      {signatureImage ? (
        <div
          style={{
            position: "absolute",
            left: centreX - SIGNATURE_INK.maxWidth / 2,
            top: SIGNATURE_INK.centreY - SIGNATURE_INK.maxHeight / 2,
            width: SIGNATURE_INK.maxWidth,
            height: SIGNATURE_INK.maxHeight,
          }}
        >
          {/* `contain` fits any orientation inside the box and centres it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signatureImage}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        </div>
      ) : null}

      <CentredBlock
        centreX={centreX}
        top={SIGNATURE.nameTop}
        width={SIGNATURE.blockWidth}
        style={{
          fontFamily: "var(--font-naskh)",
          fontSize: SIGNATURE.nameFontSize,
          fontWeight: 700,
          lineHeight: `${SIGNATURE.nameLineHeight}px`,
        }}
      >
        {name}
      </CentredBlock>
      <CentredBlock
        centreX={centreX}
        top={SIGNATURE.titleTop}
        width={SIGNATURE.blockWidth}
        style={{
          fontFamily: "var(--font-naskh)",
          fontSize: SIGNATURE.titleFontSize,
          lineHeight: `${SIGNATURE.titleLineHeight}px`,
        }}
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
  const dual = values.dualSignature;

  const signatureFor = (name: string) =>
    context.signatureImages?.[name?.trim() ?? ""] ?? undefined;

  return (
    <div
      className="certificate-surface"
      lang="fa"
      style={{
        position: "relative",
        width: CANVAS.width,
        height: CANVAS.height,
        direction: "rtl",
        // Nastaliq is the default for the headings; everything meant to be read
        // opts into the Naskh face explicitly.
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

      {/* --- Header ------------------------------------------------------- */}
      {/*
        Right block belongs to the co-signing body: on a single-signature
        certificate it carries the organisation alone, and the directorate line
        appears only when a second signatory is actually named.
      */}
      <HeaderColumn
        centreX={HEADER.columns.right}
        logo={ASSETS.logoFda}
        logoWidth={HEADER.fdaLogoWidth}
        lines={[ORGANISATION, dual ? values.secondUnitCaption?.trim() || "" : ""]}
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
        lines={[ORGANISATION, HEADER.halalUnit]}
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
        style={{
          fontFamily: "var(--font-naskh)",
          fontSize: META_BLOCK.fontSize,
          lineHeight: `${META_BLOCK.lineHeight}px`,
        }}
      >
        {`شماره: ${toPersianDigits(values.courseCode)}`}
      </CentredBlock>
      <CentredBlock
        centreX={META_BLOCK.centreX}
        top={META_BLOCK.top + META_BLOCK.lineGap}
        width={META_BLOCK.width}
        style={{
          fontFamily: "var(--font-naskh)",
          fontSize: META_BLOCK.fontSize,
          lineHeight: `${META_BLOCK.lineHeight}px`,
        }}
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
          fontFamily: "var(--font-naskh)",
          fontSize: BODY.fontSize,
          lineHeight: `${BODY.lineHeight}px`,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0 }}>
          بدینوسیله گواهی می‌شود {honorific}{" "}
          <strong style={{ fontWeight: 700 }}>{values.fullName}</strong> فرزند{" "}
          <strong style={{ fontWeight: 700 }}>{values.fatherName}</strong> دارای کد ملی{" "}
          <strong style={{ fontWeight: 700 }}>{toPersianDigits(values.nationalId)}</strong>{" "}
          در دوره آموزشی{" "}
          <strong style={{ fontWeight: 700 }}>{values.courseTitle}</strong> که در تاریخ{" "}
          {formatJalali(values.heldDate)} به صورت {attendance}
          {duration ? ` و به مدت ${toPersianDigits(duration)}` : ""} برگزار گردیده شرکت و
          دوره را با موفقیت به پایان رسانیده است.
        </p>
      </div>

      {/* --- Signatures --------------------------------------------------- */}
      {dual ? (
        <>
          <SignatureBlock
            centreX={SIGNATURE.dualCentreX.primary}
            name={values.primarySignatoryName}
            title={values.primarySignatoryTitle}
            signatureImage={signatureFor(values.primarySignatoryName)}
          />
          <SignatureBlock
            centreX={SIGNATURE.dualCentreX.secondary}
            name={values.secondSignatoryName || ""}
            title={values.secondSignatoryTitle || ""}
            signatureImage={signatureFor(values.secondSignatoryName || "")}
          />
        </>
      ) : (
        <SignatureBlock
          centreX={SIGNATURE.soloCentreX}
          name={values.primarySignatoryName}
          title={values.primarySignatoryTitle}
          signatureImage={signatureFor(values.primarySignatoryName)}
        />
      )}
    </div>
  );
}
