import {
  lightColors,
  darkColors,
  midnightColors,
  sepiaColors,
  oceanColors,
  allThemes,
  THEME_OPTIONS,
} from '../../src/shared/theme';

describe('Theme System', () => {
  it('should define all five complete theme palettes', () => {
    const themes = [lightColors, darkColors, midnightColors, sepiaColors, oceanColors];

    themes.forEach((theme) => {
      expect(theme.id).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(typeof theme.isDark).toBe('boolean');
      expect(theme.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.surface).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.card).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.textPrimary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.textSecondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.statusBar).toMatch(/^(light-content|dark-content)$/);
    });
  });

  it('should have correct dark mode flags', () => {
    expect(lightColors.isDark).toBe(false);
    expect(darkColors.isDark).toBe(true);
    expect(midnightColors.isDark).toBe(true);
    expect(sepiaColors.isDark).toBe(false);
    expect(oceanColors.isDark).toBe(true);
  });

  it('should include all options in THEME_OPTIONS', () => {
    const ids = THEME_OPTIONS.map((opt) => opt.id);
    expect(ids).toContain('system');
    expect(ids).toContain('light');
    expect(ids).toContain('dark');
    expect(ids).toContain('midnight');
    expect(ids).toContain('sepia');
    expect(ids).toContain('ocean');
  });

  it('should map theme ids in allThemes dictionary', () => {
    expect(allThemes.light).toBe(lightColors);
    expect(allThemes.dark).toBe(darkColors);
    expect(allThemes.midnight).toBe(midnightColors);
    expect(allThemes.sepia).toBe(sepiaColors);
    expect(allThemes.ocean).toBe(oceanColors);
  });
});
