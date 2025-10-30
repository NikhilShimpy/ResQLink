// JavaScript for the Ocean Hazard Reporting Platform

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu functionality
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        });
        
        // Close menu when clicking on links
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if open
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    document.body.style.overflow = '';
                }
                
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Learn More button functionality
    const learnMoreBtn = document.getElementById('learn-more');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', function() {
            // Create modal with more information
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>About OceanGuard</h2>
                    <p>OceanGuard is a initiative by the Ministry of Earth Sciences and INCOIS to protect coastal communities from ocean hazards.</p>
                    <p>Our platform enables anyone to report dangerous ocean conditions through photos and videos, even without strong literacy skills.</p>
                    <p>All reports are immediately sent to local authorities and emergency services for rapid response.</p>
                    <h3>Our Mission</h3>
                    <p>To create safer coastal communities through technology-enabled hazard reporting and rapid response systems.</p>
                    <a href="signup.html" class="btn btn-primary">Join Our Mission</a>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
            
            // Close modal functionality
            const closeModal = modal.querySelector('.close-modal');
            closeModal.addEventListener('click', function() {
                document.body.removeChild(modal);
                document.body.style.overflow = '';
            });
            
            // Close modal when clicking outside
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // Stats counter animation
    const statsSection = document.querySelector('.stats');
    const statItems = document.querySelectorAll('.stat-item h3');
    let statsAnimated = false;
    
    function animateStats() {
        if (statsAnimated) return;
        
        const statsSectionPos = statsSection.getBoundingClientRect().top;
        const screenPos = window.innerHeight / 1.3;
        
        if (statsSectionPos < screenPos) {
            statsAnimated = true;
            
            statItems.forEach(stat => {
                const target = parseInt(stat.textContent.replace('+', ''));
                let count = 0;
                const duration = 2000; // ms
                const increment = target / (duration / 20);
                
                const timer = setInterval(() => {
                    count += increment;
                    if (count >= target) {
                        stat.textContent = target + '+';
                        clearInterval(timer);
                    } else {
                        stat.textContent = Math.floor(count) + '+';
                    }
                }, 20);
            });
        }
    }
    
    // Initial check and add scroll listener
    animateStats();
    window.addEventListener('scroll', animateStats);

    // Testimonial carousel functionality
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    if (testimonialCards.length > 0) {
        let currentTestimonial = 0;
        
        // Only add carousel functionality if multiple testimonials
        if (testimonialCards.length > 1) {
            // Initially hide all but the first testimonial
            testimonialCards.forEach((card, index) => {
                if (index !== 0) {
                    card.style.display = 'none';
                }
            });
            
            // Function to show specific testimonial
            function showTestimonial(index) {
                testimonialCards.forEach(card => {
                    card.style.display = 'none';
                });
                
                testimonialCards[index].style.display = 'block';
                currentTestimonial = index;
            }
            
            // Auto-rotate testimonials
            setInterval(() => {
                let next = currentTestimonial + 1;
                if (next >= testimonialCards.length) next = 0;
                showTestimonial(next);
            }, 5000);
        }
    }

    // Feature hover animations
    const features = document.querySelectorAll('.feature');
    features.forEach(feature => {
        feature.addEventListener('mouseenter', function() {
            this.querySelector('.feature-icon').style.transform = 'scale(1.1)';
        });
        
        feature.addEventListener('mouseleave', function() {
            this.querySelector('.feature-icon').style.transform = 'scale(1)';
        });
    });

    // Step animation on scroll
    const steps = document.querySelectorAll('.step');
    const stepObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.3 });
    
    steps.forEach(step => {
        step.style.opacity = 0;
        step.style.transform = 'translateY(20px)';
        step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        stepObserver.observe(step);
    });

    // Header scroll effect
    const header = document.querySelector('.header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
            header.style.background = 'rgba(255, 255, 255, 0.95)';
        } else {
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            header.style.background = 'var(--white)';
        }
    });

    // Modal styles (dynamically added)
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1002;
            padding: 20px;
        }
        
        .modal-content {
            background-color: white;
            padding: 2rem;
            border-radius: 15px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        }
        
        .close-modal {
            position: absolute;
            top: 1rem;
            right: 1rem;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--gray-700);
        }
        
        .close-modal:hover {
            color: var(--alert-red);
        }
    `;
    document.head.appendChild(modalStyles);
});

// Placeholder function for report submission
function submitReport(reportData) {
    console.log('Submitting report:', reportData);
    // This would be connected to the backend API in a real implementation
    // Returns a promise that resolves when the report is submitted
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true, message: 'Report submitted successfully' });
        }, 1000);
    });
}

// Placeholder function for fetching alerts
function getAlerts(location) {
    console.log('Fetching alerts for:', location);
    // This would connect to the backend API in a real implementation
    // Returns a promise that resolves with alert data
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 1, type: 'high_waves', message: 'High wave warning in your area', severity: 'high' },
                { id: 2, type: 'storm', message: 'Storm approaching coastal areas', severity: 'medium' }
            ]);
        }, 1000);
    });
}