const sectionChanged = new CustomEvent("quarto-sectionChanged", {
  detail: {},
  bubbles: true,
  cancelable: false,
  composed: false,
});

window.document.addEventListener("DOMContentLoaded", function (_event) {
  // get table of contents (bail if we don't have one)
  var tocEl = window.document.getElementById("TOC");
  if (!tocEl) return;

  // function to determine whether the element has a previous sibling that is active
  const prevSiblingIsActiveLink = (el) => {
    const sibling = el.previousElementSibling;
    if (sibling && sibling.tagName === "A") {
      return sibling.classList.contains("active");
    } else {
      return false;
    }
  };

  // Track scrolling and mark TOC links as active
  const tocLinks = [...tocEl.querySelectorAll("a[data-scroll-target]")];
  const makeActive = (link) => tocLinks[link].classList.add("active");
  const removeActive = (link) => tocLinks[link].classList.remove("active");
  const removeAllActive = () =>
    [...Array(tocLinks.length).keys()].forEach((link) => removeActive(link));

  // activate the anchor for a section associated with this TOC entry
  tocLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (link.href.indexOf("#") !== -1) {
        const anchor = link.href.split("#")[1];
        const heading = window.document.querySelector(
          `[data-anchor-id=${anchor}]`
        );
        if (heading) {
          // Add the class
          heading.classList.add("reveal-anchorjs-link");

          // function to show the anchor
          const handleMouseout = () => {
            heading.classList.remove("reveal-anchorjs-link");
            heading.removeEventListener("mouseout", handleMouseout);
          };

          // add a function to clear the anchor when the user mouses out of it
          heading.addEventListener("mouseout", handleMouseout);
        }
      }
    });
  });

  const sections = tocLinks.map((link) => {
    const target = link.getAttribute("data-scroll-target");
    return window.document.querySelector(`${target}`);
  });
  const sectionMargin = 200;
  let currentActive = 0;
  // track whether we've initialized state the first time
  let init = false;

  const updateActiveLink = () => {
    // The index from bottom to top (e.g. reversed list)
    let sectionIndex = -1;
    if (
      window.innerHeight + window.pageYOffset >=
      window.document.body.offsetHeight
    ) {
      sectionIndex = 0;
    } else {
      sectionIndex = [...sections].reverse().findIndex((section) => {
        if (section) {
          return window.pageYOffset >= section.offsetTop - sectionMargin;
        } else {
          return false;
        }
      });
    }
    if (sectionIndex > -1) {
      const current = sections.length - sectionIndex - 1;
      if (current !== currentActive) {
        removeAllActive();
        currentActive = current;
        makeActive(current);
        if (init) {
          window.dispatchEvent(sectionChanged);
        }
        init = true;
      }
    }
  };

  const inHiddenRegion = (top, bottom, hiddenRegions) => {
    for (const region of hiddenRegions) {
      if (top <= region.bottom && bottom >= region.top) {
        return true;
      }
    }
    return false;
  };

  const manageSidebarVisiblity = (el) => {
    let isVisible = true;

    return (hiddenRegions) => {
      if (el === null) {
        return;
      }

      // Find the last element of the TOC
      const lastChildEl = el.lastElementChild;

      if (lastChildEl) {
        // Find the top of the first special element
        const elTop = el.offsetTop;
        const elBottom =
          elTop + lastChildEl.offsetTop + lastChildEl.offsetHeight;

        // If the TOC is hidden, check whether it will appear
        if (!isVisible) {
          if (!inHiddenRegion(elTop, elBottom, hiddenRegions)) {
            for (const child of el.children) {
              child.style.opacity = 1;
            }
            isVisible = true;
          }
        } else {
          if (inHiddenRegion(elTop, elBottom, hiddenRegions)) {
            for (const child of el.children) {
              child.style.opacity = 0;
            }
            isVisible = false;
          }
        }
      }
    };
  };

  const tocScrollVisibility = manageSidebarVisiblity(tocEl);
  const sidebarScrollVisiblity = manageSidebarVisiblity(
    window.document.getElementById("quarto-sidebar")
  );
  // Find the first element that uses formatting in special columns
  const conflictingEls = window.document.body.querySelectorAll(
    '[class^="column-"], [class*=" column-"], aside'
  );

  const arrConflictingEls = Array.from(conflictingEls);

  const leftSideConflictEls = arrConflictingEls.filter((el) => {
    if (el.tagName === "ASIDE") {
      return false;
    }
    return Array.from(el.classList).find((className) => {
      return (
        className.startsWith("column-") &&
        !className.endsWith("right") &&
        className !== "column-gutter"
      );
    });
  });
  const rightSideConflictEls = arrConflictingEls.filter((el) => {
    if (el.tagName === "ASIDE") {
      return true;
    }

    return Array.from(el.classList).find((className) => {
      return className.startsWith("column-") && !className.endsWith("left");
    });
  });

  console.log(leftSideConflictEls);
  console.log(rightSideConflictEls);

  function toRegions(els) {
    return els.map((el) => {
      return {
        top: el.offsetTop,
        bottom: el.offsetTop + el.offsetHeight,
      };
    });
  }

  const toggleTOC = () => {
    tocScrollVisibility(toRegions(rightSideConflictEls));
    sidebarScrollVisiblity(toRegions(leftSideConflictEls));
  };

  // Walk the TOC and collapse/expand nodes
  // Nodes are expanded if:
  // - they are top level
  // - they have children that are 'active' links
  // - they are directly below an link that is 'active'
  const walk = (el, depth) => {
    // Tick depth when we enter a UL
    if (el.tagName === "UL") {
      depth = depth + 1;
    }

    // It this is active link
    let isActiveNode = false;
    if (el.tagName === "A" && el.classList.contains("active")) {
      isActiveNode = true;
    }

    // See if there is an active child to this element
    let hasActiveChild = false;
    for (child of el.children) {
      hasActiveChild = walk(child, depth) || hasActiveChild;
    }

    // Process the collapse state if this is an UL
    if (el.tagName === "UL") {
      if (depth === 1 || hasActiveChild || prevSiblingIsActiveLink(el)) {
        el.classList.remove("collapse");
      } else {
        el.classList.add("collapse");
      }

      // untick depth when we leave a UL
      depth = depth - 1;
    }
    return hasActiveChild || isActiveNode;
  };

  // walk the TOC and expand / collapse any items that should be shown

  walk(tocEl, 0);
  updateActiveLink();

  // Throttle the scroll event and walk peridiocally
  window.document.addEventListener(
    "scroll",
    throttle(() => {
      updateActiveLink();
      walk(tocEl, 0);
      toggleTOC();
    }, 10)
  );
});

// TODO: Create shared throttle js function (see quarto-nav.js)
function throttle(func, wait) {
  var timeout;
  return function () {
    const context = this;
    const args = arguments;
    const later = function () {
      clearTimeout(timeout);
      timeout = null;
      func.apply(context, args);
    };

    if (!timeout) {
      timeout = setTimeout(later, wait);
    }
  };
}

// Find the side element or toc element with the highest Y position
// Find the highest full width element in the document that is full width
