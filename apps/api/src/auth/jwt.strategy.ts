import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private authService: AuthService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      // Fail-fast: sem segredo não há verificação de assinatura confiável.
      throw new Error('JWT_SECRET não definido — configuração obrigatória ausente.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'], // fixa o algoritmo (anti alg-confusion)
    });
  }

  async validate(payload: { sub: number }) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
