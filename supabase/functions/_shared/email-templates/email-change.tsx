/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

const LOGO_URL = 'https://tqagkqiodmegvfdycwtq.supabase.co/storage/v1/object/public/email-assets/tega-logo.png'

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for the TEGA Awards Portal</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="TEGA Awards" width="140" height="auto" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Confirm Your Email Change</Heading>
        <Text style={text}>
          You requested to change your email address for the TEGA Awards Portal from{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link> to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Button style={button} href={confirmationUrl}>Confirm Email Change</Button>
        <Text style={footer}>If you didn't request this change, please secure your account immediately.</Text>
        <Text style={footerBrand}>— The TEGA Awards Secretariat</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1d2b', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#D4A017', textDecoration: 'underline' }
const button = { backgroundColor: '#D4A017', color: '#1a1d2b', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const footerBrand = { fontSize: '13px', color: '#D4A017', margin: '10px 0 0', fontStyle: 'italic' as const }
