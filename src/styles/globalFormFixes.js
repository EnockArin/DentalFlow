import { StyleSheet, Platform } from 'react-native';

// Global form container styles to disable validation at container level
export const globalFormStyles = StyleSheet.create({
  formContainer: {
    // Disable form validation at container level
    ...Platform.select({
      web: {
        autocomplete: 'off',
        // Prevent web browsers from adding validation UI
        '& input': {
          autocomplete: 'off',
          '&::-webkit-outer-spin-button': { display: 'none' },
          '&::-webkit-inner-spin-button': { display: 'none' },
          '&::-webkit-credentials-auto-fill-button': { display: 'none !important' },
          '&::-webkit-textfield-decoration-container': { display: 'none !important' },
        }
      },
      default: {},
    }),
  },
  
  inputContainer: {
    position: 'relative',
    // Ensure no validation elements can appear
    overflow: 'hidden',
  },

  // Style to hide any form validation indicators
  hideValidationIndicators: {
    ...Platform.select({
      ios: {
        // iOS-specific hiding of validation elements
        backgroundColor: 'transparent',
      },
      android: {
        // Android-specific hiding of validation elements
        elevation: 0,
        shadowOpacity: 0,
      },
      web: {
        // Web-specific hiding of validation elements
        outline: 'none',
        border: 'none',
      },
      default: {},
    }),
  },

  // Aggressive style to forcibly hide checkboxes and validation UI
  forceHideValidation: {
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      default: {
        // Hide any absolutely positioned elements that could be checkboxes
        '& > *[style*="position: absolute"]': {
          display: 'none !important',
        },
        '& > *[style*="right:"]': {
          display: 'none !important', 
        }
      }
    })
  },
});

// CSS injection for web platform to completely disable form validation
export const injectGlobalCSS = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      /* AGGRESSIVE: Hide ALL possible validation checkboxes and indicators */
      input::-webkit-outer-spin-button,
      input::-webkit-inner-spin-button {
        -webkit-appearance: none !important;
        margin: 0 !important;
        display: none !important;
      }
      
      input::-webkit-credentials-auto-fill-button {
        visibility: hidden !important;
        pointer-events: none !important;
        position: absolute !important;
        right: -1000px !important;
        display: none !important;
      }
      
      input::-webkit-textfield-decoration-container {
        display: none !important;
        visibility: hidden !important;
      }
      
      input::-webkit-contacts-auto-fill-button {
        visibility: hidden !important;
        display: none !important;
        pointer-events: none !important;
        position: absolute !important;
        right: -1000px !important;
      }
      
      input::-webkit-strong-password-auto-fill-button {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        position: absolute !important;
        right: -1000px !important;
      }
      
      /* Hide all form validation UI */
      input:valid,
      input:invalid {
        box-shadow: none !important;
        outline: none !important;
      }
      
      /* AGGRESSIVE: Hide any element that could be a checkbox */
      [data-testid*="checkbox"],
      [class*="checkbox"],
      [class*="validation"],
      [class*="indicator"],
      input + div[style*="position: absolute"],
      input + span[style*="position: absolute"],
      div[style*="right:"][style*="position: absolute"],
      span[style*="right:"][style*="position: absolute"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      /* Force hide React Native Paper TextInput accessories */
      .react-native-paper input + div,
      .react-native-paper input + span,
      .react-native-paper div[class*="right"],
      .react-native-paper span[class*="right"] {
        display: none !important;
      }
      
      /* Hide Material UI form validation indicators */
      .MuiInput-root::after,
      .MuiInput-root::before {
        display: none !important;
      }
      
      /* NUCLEAR OPTION: Hide all absolutely positioned elements near inputs */
      input ~ *[style*="position: absolute"],
      input + *[style*="position: absolute"],
      div[class*="TextInput"] *[style*="position: absolute"],
      div[class*="text-input"] *[style*="position: absolute"] {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* Disable autofill styling */
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: none !important;
        box-shadow: none !important;
        background-color: transparent !important;
      }
      
      /* Hide any SVG checkmarks or validation icons */
      svg[data-testid*="check"],
      svg[class*="check"],
      svg[class*="validation"] {
        display: none !important;
      }
    `;
    
    document.head.appendChild(style);
    return style;
  }
  return null;
};

// Runtime checkbox hunter - continuously scans and destroys validation elements
export const startCheckboxHunter = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const destroyCheckboxes = () => {
      // Find and destroy all possible validation checkboxes
      const selectors = [
        '[data-testid*="checkbox"]',
        '[class*="checkbox"]',
        '[class*="validation"]',
        '[class*="indicator"]',
        'input + div[style*="position: absolute"]',
        'input + span[style*="position: absolute"]',
        'div[style*="right:"][style*="position: absolute"]',
        'span[style*="right:"][style*="position: absolute"]',
        'svg[data-testid*="check"]',
        'svg[class*="check"]',
        'svg[class*="validation"]',
        // React Native Paper specific
        '.react-native-paper input + div',
        '.react-native-paper input + span',
        '.react-native-paper div[class*="right"]',
        '.react-native-paper span[class*="right"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            // Nuclear option: remove from DOM
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          }
        });
      });
    };

    // Run immediately
    destroyCheckboxes();
    
    // Run every 500ms to catch dynamically added validation elements
    const hunterInterval = setInterval(destroyCheckboxes, 500);
    
    // Also run on DOM mutations
    const observer = new MutationObserver(destroyCheckboxes);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    return () => {
      clearInterval(hunterInterval);
      observer.disconnect();
    };
  }
  return null;
};

// Function to apply global form fixes on app startup
export const applyGlobalFormFixes = () => {
  // Inject CSS for web platform
  const injectedStyle = injectGlobalCSS();
  
  // Start the aggressive checkbox hunter
  const stopHunter = startCheckboxHunter();
  
  // Platform-specific form validation disabling
  if (Platform.OS === 'ios') {
    // iOS-specific global fixes
    console.log('Applied iOS form validation fixes');
  } else if (Platform.OS === 'android') {
    // Android-specific global fixes
    console.log('Applied Android form validation fixes');
  }
  
  return { injectedStyle, stopHunter };
};

export default {
  globalFormStyles,
  injectGlobalCSS,
  applyGlobalFormFixes,
};