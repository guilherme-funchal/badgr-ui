import {Component} from '@angular/core';
import {FormBuilder, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {EmailValidator} from '../../../common/validators/email.validator';
import {SessionService} from '../../../common/services/session.service';
import {MessageService} from '../../../common/services/message.service';
import {BaseRoutableComponent} from '../../../common/pages/base-routable.component';
import {typedFormGroup} from '../../../common/util/typed-forms';

@Component({
	selector: 'password-reset-request',
	templateUrl: 'request-password-reset.component.html'
})
export class RequestPasswordResetComponent extends BaseRoutableComponent {
	readonly requestPasswordResetForm = typedFormGroup()
		.addControl('username', '', [Validators.required, EmailValidator.validEmail]);

	get prefilledEmail() {
		return this.route.snapshot.params['email'];
	}

	constructor(
		private fb: FormBuilder,
		private sessionService: SessionService,
		private messageService: MessageService,
		route: ActivatedRoute,
		router: Router
	) {
		super(router, route);
	}

	ngOnInit() {
		super.ngOnInit();

		if (this.sessionService.isLoggedIn) {
			this.router.navigate(['/userProfile']);
		}

		if (this.prefilledEmail) {
			this.requestPasswordResetForm.controls.username.setValue(this.prefilledEmail);
		}
	}

	submitResetRequest() {
		if (! this.requestPasswordResetForm.markTreeDirtyAndValidate()) {
			return;
		}

		const email: string = this.requestPasswordResetForm.value.username;

		this.sessionService.submitResetPasswordRequest(email).then(
			response => this.router.navigate(['/auth/reset-password-sent']),
			err => {
				if (err.status === 429) {
					this.messageService.reportAndThrowError(
						'O limite de solicitação de senha esquecida foi excedido.' +
						'Verifique sua caixa de entrada para ver se há uma mensagem existente ou espere para tentar novamente.',
						err
					);
				} else {
					this.messageService.reportAndThrowError(
						'Falha ao enviar solicitação de redefinição de senha. Entre em contato com o suporte.',
						err
					);
				}
			}
		);
	}
}
