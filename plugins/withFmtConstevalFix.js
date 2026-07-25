const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'HOMPRA_FMT_CONSTEVAL_FIX';

// Snippet Ruby iniettato nel post_install del Podfile. Al momento di `pod install`
// forza FMT_USE_CONSTEVAL=0 nel sorgente di fmt (RN 0.76 porta fmt 11): i compilatori
// recenti (Xcode 16+/clang 21) rifiutano la `consteval` del costruttore
// basic_format_string. Disabilitandola, il controllo delle format string passa da
// compile-time a runtime, esattamente come sui compilatori piu' datati. App invariata.
const RUBY_SNIPPET = `
    # ${MARKER}: patch fmt per compilatori con consteval piu' severa (Xcode 16+/clang 21).
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      src = File.read(fmt_base)
      unless src.include?('${MARKER}')
        src = src.sub(
          "#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval",
          "// ${MARKER}\\n#undef FMT_USE_CONSTEVAL\\n#define FMT_USE_CONSTEVAL 0\\n#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval"
        )
        File.write(fmt_base, src)
      end
    end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes(MARKER)) {
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          (match) => match + RUBY_SNIPPET + '\n',
        );
        fs.writeFileSync(podfile, contents);
      }
      return config;
    },
  ]);
};
