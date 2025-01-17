import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {SessionService} from '../../../common/services/session.service';
import {BaseAuthenticatedRoutableComponent} from '../../../common/pages/base-authenticated-routable.component';
import {MessageService} from '../../../common/services/message.service';
import {IssuerManager} from '../../services/issuer-manager.service';
import {UserProfileManager} from '../../../common/services/user-profile-manager.service';
import {BadgeClassManager} from '../../services/badgeclass-manager.service';
import {UserProfile, UserProfileEmail} from '../../../common/model/user-profile.model';
import {Issuer} from '../../models/issuer.model';
import {BadgeClass} from '../../models/badgeclass.model';
import {Title} from '@angular/platform-browser';
import {preloadImageURL} from '../../../common/util/file-util';
import {AppConfigService} from '../../../common/app-config.service';
import { profile } from 'console';
import {Subscription} from 'rxjs';

@Component({
	selector: 'issuer-list',
	templateUrl: './issuer-list.component.html',
})
export class IssuerListComponent extends BaseAuthenticatedRoutableComponent implements OnInit {
	readonly issuerPlaceholderSrc = preloadImageURL(require('../../../../breakdown/static/images/placeholderavatar-issuer.svg') as string);
	readonly noIssuersPlaceholderSrc = require('../../../../../node_modules/@concentricsky/badgr-style/dist/images/image-empty-issuer.svg') as string;

	Array = Array;

	profile: UserProfile; 

	issuers: Issuer[] = null;
	badges: BadgeClass[] = null;
	issuerToBadgeInfo: {[issuerId: string]: IssuerBadgesInfo} = {};
	emails: UserProfileEmail[];

	issuersLoaded: Promise<unknown>;
	badgesLoaded: Promise<unknown>;
	profileLoaded: Promise<unknown>;
	private emailsSubscription: Subscription;

	get theme() { return this.configService.theme; }
	get features() { return this.configService.featuresConfig; }

	plural = {
		'issuer': {
			'=0' : 'No Issuers',
			'=1' : '1 Issuer',
			'other' : '# Issuers'
		},
		'badges': {
			'=0' : 'No Badges',
			'=1' : '<strong class="u-text-bold">1</strong> Badge',
			'other' : '<strong class="u-text-bold">#</strong> Badges'
		},
		'recipient': {
			'=0' : 'No Recipients',
			'=1' : '1 Recipient',
			'other' : '# Recipients'
		}
	};

	constructor(
		protected title: Title,
		protected messageService: MessageService,
		protected issuerManager: IssuerManager,
		protected configService: AppConfigService,
		protected badgeClassService: BadgeClassManager,
		private profileManager: UserProfileManager,
		loginService: SessionService,
		router: Router,
		route: ActivatedRoute
	) {
		super(router, route, loginService);
		title.setTitle(`Issuers - ${this.configService.theme['serviceName'] || "Badgr"}`);

		// subscribe to issuer and badge class changes
		this.issuersLoaded = this.loadIssuers();

		this.profileLoaded = this.profileManager.userProfilePromise.then(
			profile => {
					this.profile = profile;

					this.emailsSubscription = profile.emails.loaded$.subscribe(update => {
							const emails = profile.emails.entities;

							this.emails = emails.filter((e) => e.primary).concat(
									emails.filter((e) => e.verified && !e.primary).concat(
											emails.filter((e) => !e.verified)
									)
							);
					});
			},
			error => this.messageService.reportAndThrowError(
					"Failed to load userProfile", error
			)
	);


		this.badgesLoaded = new Promise((resolve, reject) => {

			this.badgeClassService.badgesByIssuerUrl$.subscribe(badges => {
				this.issuerToBadgeInfo = {};

				Object.keys(badges).forEach(issuerSlug => {
					const issuerBadges = badges[ issuerSlug ];

					this.issuerToBadgeInfo[ issuerSlug ] = new IssuerBadgesInfo(
						issuerBadges.reduce((sum, badge) => sum + badge.recipientCount, 0),
						issuerBadges.sort((a, b) => b.recipientCount - a.recipientCount)
					);
				});

				resolve();
			});

		});
	}

	loadIssuers = () => {
		return new Promise((resolve, reject) => {

			this.issuerManager.allIssuers$.subscribe(
				(issuers) => {
					this.issuers = issuers.slice().sort(
						(a, b) => b.createdAt.getTime() - a.createdAt.getTime()
					);
					resolve();
				},
				error => {
					this.messageService.reportAndThrowError("Failed to load issuers", error);
					resolve();
				}
			);

		});
	};

	get socialAccounts() {
		return this.profile && this.profile.socialAccounts.entities;
	}

	ngOnInit() {
		super.ngOnInit();
	}
}

class IssuerBadgesInfo {
	constructor(
		public totalBadgeIssuanceCount = 0,
		public badges: BadgeClass[] = []
	) {}
}

