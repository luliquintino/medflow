import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      clientID: config.get<string>('google.clientId') || 'GOOGLE_CLIENT_ID',
      clientSecret: config.get<string>('google.clientSecret') || 'GOOGLE_CLIENT_SECRET',
      callbackURL: config.get<string>('google.callbackUrl') || 'http://localhost:3001/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id: googleId, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value?.toLowerCase();
    const avatarUrl = photos?.[0]?.value;

    if (!email) {
      return done(new Error('No email from Google'), null);
    }

    // Try to find existing user by googleId or email
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { subscription: { select: { plan: true, status: true } } },
    });

    if (user) {
      // Update googleId if not set
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId },
          include: { subscription: { select: { plan: true, status: true } } },
        });
      }
    } else {
      // Create new user via Google
      user = await this.prisma.user.create({
        data: {
          name: displayName || email.split('@')[0],
          email,
          googleId,
          avatarUrl: avatarUrl || null,
          subscription: {
            create: {
              plan: 'ESSENTIAL',
              status: SubscriptionStatus.ACTIVE,
            },
          },
        },
        include: { subscription: { select: { plan: true, status: true } } },
      });
    }

    return done(null, user);
  }
}
